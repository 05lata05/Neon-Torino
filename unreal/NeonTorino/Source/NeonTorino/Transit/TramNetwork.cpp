#include "TramNetwork.h"

#include "GttTram.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SplineComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "UObject/ConstructorHelpers.h"

DEFINE_LOG_CATEGORY_STATIC(LogNeonTrams, Log, All);

namespace
{
	constexpr double GaugeCm = 143.5;       // standard gauge, Turin
	constexpr double StopSearchCm = 1500.0; // a platform belongs to a route if it is this close to its track
	constexpr double StopMergeCm = 3000.0;  // platforms of both directions project to nearly the same point
	constexpr double GroundMarginM = 80.0;  // tools/export_gltf.mjs: the ground covers every road + 80 m

	bool ReadPoint(const TSharedPtr<FJsonValue>& Value, double& OutA, double& OutB)
	{
		if (!Value.IsValid() || Value->Type != EJson::Array)
		{
			return false;
		}
		const TArray<TSharedPtr<FJsonValue>>& P = Value->AsArray();
		if (P.Num() < 2)
		{
			return false;
		}
		OutA = P[0]->AsNumber();
		OutB = P[1]->AsNumber();
		return true;
	}

	TArray<FVector2D> ReadPolyline(const TSharedPtr<FJsonValue>& Value)
	{
		TArray<FVector2D> Out;
		if (Value.IsValid() && Value->Type == EJson::Array)
		{
			for (const TSharedPtr<FJsonValue>& P : Value->AsArray())
			{
				double A, B;
				if (ReadPoint(P, A, B))
				{
					Out.Emplace(A, B);
				}
			}
		}
		return Out;
	}
}

ATramNetwork::ATramNetwork()
{
	PrimaryActorTick.bCanEverTick = false;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	Rails = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Rails"));
	Rails->SetupAttachment(Root);
	Rails->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Rails->SetCastShadow(false);

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	if (Cube.Succeeded())
	{
		Rails->SetStaticMesh(Cube.Object);
	}
}

FVector ATramNetwork::ToWorld(double East, double South, double Up) const
{
	// the 8 ways to map [east, south] onto Unreal's X/Y: swap or not, and the two signs
	const int32 Mode = FMath::Clamp(AxisMode, 0, 7);
	const bool bSwap = (Mode & 4) != 0;
	const double SignX = (Mode & 1) ? -1.0 : 1.0;
	const double SignY = (Mode & 2) ? -1.0 : 1.0;
	const double A = bSwap ? South : East;
	const double B = bSwap ? East : South;
	return FVector(SignX * A * 100.0, SignY * B * 100.0, Up * 100.0);
}

void ATramNetwork::BeginPlay()
{
	Super::BeginPlay();

	TSharedPtr<FJsonObject> Data;
	if (!LoadData(Data))
	{
		return;
	}
	ChooseAxisMode(Data);
	BuildRails(Data);
	BuildRoutes(Data);
	SpawnTrams();
}

bool ATramNetwork::LoadData(TSharedPtr<FJsonObject>& OutRoot) const
{
	const FString Path = FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), DataFile));
	FString Text;
	if (!FFileHelper::LoadFileToString(Text, *Path))
	{
		UE_LOG(LogNeonTrams, Warning, TEXT("Trams: data file not found: %s (run npm run unreal)"), *Path);
		return false;
	}
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
	if (!FJsonSerializer::Deserialize(Reader, OutRoot) || !OutRoot.IsValid())
	{
		UE_LOG(LogNeonTrams, Warning, TEXT("Trams: cannot read %s"), *Path);
		return false;
	}
	return true;
}

void ATramNetwork::ChooseAxisMode(const TSharedPtr<FJsonObject>& Data)
{
	if (AxisMode >= 0)
	{
		UE_LOG(LogNeonTrams, Log, TEXT("Trams: axis mode %d forced"), AxisMode);
		return;
	}
	AxisMode = 0;

	// extent of the data: the road graph nodes (the exported ground covers them + 80 m)
	double E0 = TNumericLimits<double>::Max(), E1 = TNumericLimits<double>::Lowest();
	double S0 = E0, S1 = E1;
	const TSharedPtr<FJsonObject>* Graph = nullptr;
	const TArray<TSharedPtr<FJsonValue>>* Nodes = nullptr;
	if (Data->TryGetObjectField(TEXT("roadGraph"), Graph) && (*Graph)->TryGetArrayField(TEXT("nodes"), Nodes))
	{
		for (const TSharedPtr<FJsonValue>& N : *Nodes)
		{
			double E, S;
			if (ReadPoint(N, E, S))
			{
				E0 = FMath::Min(E0, E);
				E1 = FMath::Max(E1, E);
				S0 = FMath::Min(S0, S);
				S1 = FMath::Max(S1, S);
			}
		}
	}

	// extent of the imported ground mesh
	FBox Ground(ForceInit);
	for (TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
	{
		const UStaticMeshComponent* C = It->GetStaticMeshComponent();
		if (C && C->GetStaticMesh() && C->GetStaticMesh()->GetName().Contains(TEXT("Ground")))
		{
			Ground += It->GetComponentsBoundingBox(true);
		}
	}
	if (!Ground.IsValid || E0 > E1)
	{
		UE_LOG(LogNeonTrams, Warning, TEXT("Trams: no imported Ground mesh found, using axis mode 0 (set AxisMode if the trams are off the streets)"));
		return;
	}
	E0 -= GroundMarginM;
	E1 += GroundMarginM;
	S0 -= GroundMarginM;
	S1 += GroundMarginM;

	double BestError = TNumericLimits<double>::Max();
	int32 BestMode = 0;
	for (int32 Mode = 0; Mode < 8; ++Mode)
	{
		AxisMode = Mode;
		FBox Box(ForceInit);
		Box += ToWorld(E0, S0);
		Box += ToWorld(E1, S1);
		const double Error = FMath::Abs(Box.Min.X - Ground.Min.X) + FMath::Abs(Box.Max.X - Ground.Max.X) +
			FMath::Abs(Box.Min.Y - Ground.Min.Y) + FMath::Abs(Box.Max.Y - Ground.Max.Y);
		if (Error < BestError)
		{
			BestError = Error;
			BestMode = Mode;
		}
	}
	AxisMode = BestMode;
	UE_LOG(LogNeonTrams, Log, TEXT("Trams: axis mode %d, ground match within %.1f m"), AxisMode, BestError / 400.0);
	if (BestError / 400.0 > 50.0)
	{
		UE_LOG(LogNeonTrams, Warning, TEXT("Trams: poor match with the Ground mesh: check that the trams run on the streets"));
	}
}

void ATramNetwork::BuildRails(const TSharedPtr<FJsonObject>& Data)
{
	UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (Base)
	{
		UMaterialInstanceDynamic* Steel = UMaterialInstanceDynamic::Create(Base, this);
		Steel->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.32f, 0.31f, 0.30f));
		Rails->SetMaterial(0, Steel);
	}

	const TArray<TSharedPtr<FJsonValue>>* Tracks = nullptr;
	if (!Data->TryGetArrayField(TEXT("tramTracks"), Tracks))
	{
		return;
	}
	int32 Count = 0;
	for (const TSharedPtr<FJsonValue>& T : *Tracks)
	{
		const TArray<FVector2D> P = ReadPolyline(T);
		for (int32 i = 0; i + 1 < P.Num(); ++i)
		{
			const FVector A = ToWorld(P[i].X, P[i].Y);
			const FVector B = ToWorld(P[i + 1].X, P[i + 1].Y);
			const FVector D = B - A;
			const double Len = D.Size2D();
			if (Len < 1.0)
			{
				continue;
			}
			const FVector Dir = D / Len;
			const FVector Side(-Dir.Y, Dir.X, 0.0);
			const FRotator Rot = Dir.Rotation();
			for (const double Offset : {-GaugeCm / 2, GaugeCm / 2})
			{
				// a cube is 100 cm: rails 7 cm wide, 8 cm tall, a little longer than the segment so bends have no gaps
				const FVector Mid = (A + B) / 2 + Side * Offset + FVector(0, 0, RailHeight - 4.0);
				Rails->AddInstance(FTransform(Rot, Mid, FVector((Len + 20.0) / 100.0, 0.07, 0.08)), true);
				++Count;
			}
		}
	}
	UE_LOG(LogNeonTrams, Log, TEXT("Trams: %d rail pieces"), Count);
}

void ATramNetwork::BuildRoutes(const TSharedPtr<FJsonObject>& Data)
{
	const TArray<TSharedPtr<FJsonValue>>* Lines = nullptr;
	if (!Data->TryGetArrayField(TEXT("tramLines"), Lines))
	{
		UE_LOG(LogNeonTrams, Warning, TEXT("Trams: no tramLines in the data"));
		return;
	}
	TArray<FVector> StopPoints;
	const TArray<TSharedPtr<FJsonValue>>* StopsJson = nullptr;
	if (Data->TryGetArrayField(TEXT("tramStops"), StopsJson))
	{
		for (const TSharedPtr<FJsonValue>& S : *StopsJson)
		{
			const TSharedPtr<FJsonObject>* Obj = nullptr;
			const TArray<TSharedPtr<FJsonValue>>* Pos = nullptr;
			if (S->TryGetObject(Obj) && (*Obj)->TryGetArrayField(TEXT("position"), Pos) && Pos->Num() >= 2)
			{
				StopPoints.Add(ToWorld((*Pos)[0]->AsNumber(), (*Pos)[1]->AsNumber(), RailHeight / 100.0));
			}
		}
	}

	for (const TSharedPtr<FJsonValue>& L : *Lines)
	{
		const TSharedPtr<FJsonObject>* Obj = nullptr;
		if (!L->TryGetObject(Obj))
		{
			continue;
		}
		FTramLineRoute Route;
		if (!(*Obj)->TryGetStringField(TEXT("line"), Route.Line))
		{
			double Num = 0;
			Route.Line = (*Obj)->TryGetNumberField(TEXT("line"), Num) ? FString::FromInt(int32(Num)) : TEXT("?");
		}
		const TSharedPtr<FJsonValue> PointsValue = (*Obj)->TryGetField(TEXT("points"));
		const TArray<FVector2D> P = ReadPolyline(PointsValue);
		if (P.Num() < 2)
		{
			continue;
		}

		USplineComponent* Spline = NewObject<USplineComponent>(this);
		Spline->SetupAttachment(Root);
		Spline->RegisterComponent();
		Spline->ClearSplinePoints(false);
		for (int32 i = 0; i < P.Num(); ++i)
		{
			Spline->AddSplinePoint(ToWorld(P[i].X, P[i].Y, RailHeight / 100.0), ESplineCoordinateSpace::World, false);
			Spline->SetSplinePointType(i, ESplinePointType::Linear, false);
		}
		Spline->UpdateSpline();
		Route.Path = Spline;

		// stops: platforms close to this track, projected onto it; both directions' platforms are merged
		for (const FVector& Stop : StopPoints)
		{
			const float Key = Spline->FindInputKeyClosestToWorldLocation(Stop);
			const FVector OnTrack = Spline->GetLocationAtSplineInputKey(Key, ESplineCoordinateSpace::World);
			if (FVector::Dist2D(OnTrack, Stop) > StopSearchCm)
			{
				continue;
			}
			const float D = Spline->GetDistanceAlongSplineAtSplineInputKey(Key);
			if (!Route.Stops.ContainsByPredicate([D](float Other) { return FMath::Abs(Other - D) < StopMergeCm; }))
			{
				Route.Stops.Add(D);
			}
		}
		Route.Stops.Sort();
		UE_LOG(LogNeonTrams, Log, TEXT("Trams: line %s, %.0f m, %d stops"), *Route.Line, Spline->GetSplineLength() / 100.0, Route.Stops.Num());
		Routes.Add(Route);
	}
}

void ATramNetwork::SpawnTrams()
{
	for (int32 r = 0; r < Routes.Num(); ++r)
	{
		const FTramLineRoute& Route = Routes[r];
		const float Length = Route.Path->GetSplineLength();
		for (int32 k = 0; k < TramsPerRoute; ++k)
		{
			FActorSpawnParameters Params;
			Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
			AGttTram* Tram = GetWorld()->SpawnActor<AGttTram>(AGttTram::StaticClass(), FTransform::Identity, Params);
			if (Tram)
			{
				// spread the trams along the line
				const float Start = Length * (k + 0.5f) / FMath::Max(1, TramsPerRoute);
				Tram->Setup(Route.Path, Route.Stops, Route.Line, Start);
				Trams.Add(Tram);
			}
		}
	}
	UE_LOG(LogNeonTrams, Log, TEXT("Trams: %d trams on %d routes"), Trams.Num(), Routes.Num());
}
