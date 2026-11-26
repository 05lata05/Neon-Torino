#include "TramNetwork.h"

#include "GttTram.h"
#include "Dom/JsonObject.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SplineComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

DEFINE_LOG_CATEGORY_STATIC(LogNeonTrams, Log, All);

namespace
{
	constexpr double GaugeCm = 143.5;       // standard gauge, Turin
	constexpr double StopSearchCm = 1500.0; // a platform belongs to a route if it is this close to its track
	constexpr double StopMergeCm = 3000.0;  // platforms of both directions project to nearly the same point
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

void ATramNetwork::BeginPlay()
{
	Super::BeginPlay();
	if (!Data.Load(GetWorld(), DataFile, AxisMode))
	{
		return;
	}
	BuildRails();
	BuildRoutes();
	SpawnTrams();
}

void ATramNetwork::BuildRails()
{
	UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (Base)
	{
		UMaterialInstanceDynamic* Steel = UMaterialInstanceDynamic::Create(Base, this);
		Steel->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.32f, 0.31f, 0.30f));
		Rails->SetMaterial(0, Steel);
	}

	int32 Count = 0;
	for (const TSharedPtr<FJsonValue>& T : Data.Array(TEXT("tramTracks")))
	{
		const TArray<FVector2D> P = FSantaRitaData::ReadPolyline(T);
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

void ATramNetwork::BuildRoutes()
{
	TArray<FVector> StopPoints;
	for (const TSharedPtr<FJsonValue>& S : Data.Array(TEXT("tramStops")))
	{
		double E, N;
		if (FSantaRitaData::ReadPosition(S->AsObject(), E, N))
		{
			StopPoints.Add(ToWorld(E, N, RailHeight / 100.0));
		}
	}

	for (const TSharedPtr<FJsonValue>& L : Data.Array(TEXT("tramLines")))
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
		const TArray<FVector2D> P = FSantaRitaData::ReadPolyline(PointsValue);
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
