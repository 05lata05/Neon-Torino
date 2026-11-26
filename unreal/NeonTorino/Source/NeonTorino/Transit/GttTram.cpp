#include "GttTram.h"

#include "Components/SplineComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Components/TextRenderComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

float AGttTram::ModuleLength(int32 Index)
{
	// cab module, suspended (doors), middle on bogie, suspended (doors), rear module with the lounge
	static const float Lengths[NumModules] = {700.f, 440.f, 560.f, 440.f, 620.f};
	return Lengths[FMath::Clamp(Index, 0, NumModules - 1)];
}

float AGttTram::TotalLength()
{
	float L = Gap * (NumModules - 1);
	for (int32 i = 0; i < NumModules; ++i)
	{
		L += ModuleLength(i);
	}
	return L;
}

AGttTram::AGttTram()
{
	PrimaryActorTick.bCanEverTick = true;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Root->SetMobility(EComponentMobility::Movable);
	RootComponent = Root;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	UStaticMesh* CubeMesh = Cube.Succeeded() ? Cube.Object : nullptr;

	// a part of a module, sized and placed in metres from the module's centre (x forward, y right, z up),
	// converted to the module's local space (a 100 cm cube scaled to the module's size)
	auto AddPart = [this, CubeMesh](UStaticMeshComponent* Module, const FVector& ModuleM, const FString& Name, FName Tag, FVector SizeM, FVector CentreM)
	{
		UStaticMeshComponent* P = CreateDefaultSubobject<UStaticMeshComponent>(*Name);
		P->SetupAttachment(Module);
		P->SetMobility(EComponentMobility::Movable);
		P->SetStaticMesh(CubeMesh);
		P->SetRelativeScale3D(SizeM / ModuleM);
		P->SetRelativeLocation(CentreM / ModuleM * 100.f);
		P->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		P->ComponentTags.Add(Tag);
	};

	const float H = Height / 100.f, Half = H / 2, W = Width / 100.f;
	for (int32 i = 0; i < NumModules; ++i)
	{
		const FString N = FString::Printf(TEXT("Module%d"), i);
		UStaticMeshComponent* M = CreateDefaultSubobject<UStaticMeshComponent>(*N);
		M->SetupAttachment(Root);
		M->SetMobility(EComponentMobility::Movable);
		// placed in world space every frame, independently of the actor's root
		M->SetUsingAbsoluteLocation(true);
		M->SetUsingAbsoluteRotation(true);
		M->SetStaticMesh(CubeMesh);
		const float L = ModuleLength(i) / 100.f;
		const FVector Size(L, W, H);
		M->SetRelativeScale3D(Size);
		M->SetCollisionProfileName(TEXT("BlockAllDynamic"));
		M->SetSimulatePhysics(false);
		M->ComponentTags.Add(TEXT("Yellow"));
		Modules.Add(M);

		// blue lower body, dark window band, light grey roof
		AddPart(M, Size, N + TEXT("Lower"), TEXT("Blue"), FVector(L + 0.01f, W + 0.02f, 0.9f), FVector(0, 0, -Half + 0.55f));
		AddPart(M, Size, N + TEXT("Windows"), TEXT("Glass"), FVector(L - 0.4f, W + 0.04f, 1.3f), FVector(0, 0, -Half + 1.75f));
		AddPart(M, Size, N + TEXT("Roof"), TEXT("Roof"), FVector(L - 0.2f, W - 0.2f, 0.15f), FVector(0, 0, Half + 0.07f));
		if (i == 0 || i == 2 || i == NumModules - 1)
		{
			// equipment on the roof above the bogies
			AddPart(M, Size, N + TEXT("RoofBox"), TEXT("Roof"), FVector(FMath::Min(2.5f, L - 1.f), 1.6f, 0.3f), FVector(0, 0, Half + 0.25f));
		}
		if (i == 1 || i == 3)
		{
			// two double doors (1.30 m) per suspended module, on the right side only: single-ended tram
			for (const float X : {-1.0f, 1.0f})
			{
				AddPart(M, Size, N + (X < 0 ? TEXT("DoorRear") : TEXT("DoorFront")), TEXT("Door"), FVector(1.3f, 0.04f, 2.1f),
					FVector(X, W / 2 + 0.03f, -Half + 1.1f));
			}
		}
	}

	// cab: large windscreen, blue front mask, headlights, destination display
	{
		UStaticMeshComponent* M = Modules[0];
		const float L = ModuleLength(0) / 100.f;
		const FVector Size(L, W, H);
		AddPart(M, Size, TEXT("Windscreen"), TEXT("Glass"), FVector(0.08f, W - 0.1f, 1.7f), FVector(L / 2 + 0.03f, 0, -Half + 2.05f));
		AddPart(M, Size, TEXT("FrontMask"), TEXT("Blue"), FVector(0.1f, W + 0.02f, 1.15f), FVector(L / 2 + 0.04f, 0, -Half + 0.6f));
		AddPart(M, Size, TEXT("Display"), TEXT("Dark"), FVector(0.06f, 1.4f, 0.3f), FVector(L / 2 + 0.05f, 0, Half - 0.22f));
		for (const float Y : {-0.85f, 0.85f})
		{
			AddPart(M, Size, Y < 0 ? TEXT("HeadlightL") : TEXT("HeadlightR"), TEXT("Light"), FVector(0.06f, 0.3f, 0.12f), FVector(L / 2 + 0.1f, Y, -Half + 0.8f));
		}
	}
	// rear: rear window and red lights
	{
		UStaticMeshComponent* M = Modules[NumModules - 1];
		const float L = ModuleLength(NumModules - 1) / 100.f;
		const FVector Size(L, W, H);
		AddPart(M, Size, TEXT("RearWindow"), TEXT("Glass"), FVector(0.06f, W - 0.3f, 1.2f), FVector(-L / 2 - 0.03f, 0, -Half + 1.9f));
		for (const float Y : {-0.85f, 0.85f})
		{
			AddPart(M, Size, Y < 0 ? TEXT("TailLightL") : TEXT("TailLightR"), TEXT("Red"), FVector(0.06f, 0.25f, 0.12f), FVector(-L / 2 - 0.06f, Y, -Half + 0.8f));
		}
	}
	// pantograph on the middle module
	{
		UStaticMeshComponent* M = Modules[2];
		const FVector Size(ModuleLength(2) / 100.f, W, H);
		AddPart(M, Size, TEXT("PantographBase"), TEXT("Dark"), FVector(1.2f, 0.9f, 0.12f), FVector(0, 0, Half + 0.46f));
		AddPart(M, Size, TEXT("PantographArm"), TEXT("Dark"), FVector(0.08f, 0.08f, 1.1f), FVector(0.3f, 0, Half + 1.05f));
		AddPart(M, Size, TEXT("PantographHead"), TEXT("Dark"), FVector(0.15f, 1.6f, 0.06f), FVector(0.3f, 0, Half + 1.6f));
	}
}

void AGttTram::Setup(USplineComponent* InPath, const TArray<float>& InStops, const FString& InLine, float Start)
{
	Path = InPath;
	Stops = InStops;
	Line = InLine;
	S = FMath::Max(Start, TotalLength() + 100.f);
	Speed = 0.f;

	UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (Base)
	{
		TMap<FName, UMaterialInstanceDynamic*> Paints;
		auto Paint = [&](FName Tag, const FLinearColor& C)
		{
			UMaterialInstanceDynamic* M = UMaterialInstanceDynamic::Create(Base, this);
			M->SetVectorParameterValue(TEXT("Color"), C);
			Paints.Add(Tag, M);
		};
		Paint(TEXT("Yellow"), Yellow);
		Paint(TEXT("Blue"), Blue);
		Paint(TEXT("Glass"), FLinearColor(0.02f, 0.035f, 0.05f));
		Paint(TEXT("Door"), FLinearColor(0.05f, 0.07f, 0.09f));
		Paint(TEXT("Roof"), FLinearColor(0.72f, 0.73f, 0.72f));
		Paint(TEXT("Dark"), FLinearColor(0.06f, 0.06f, 0.06f));
		Paint(TEXT("Light"), FLinearColor(1.f, 0.97f, 0.85f));
		Paint(TEXT("Red"), FLinearColor(0.8f, 0.02f, 0.02f));
		TArray<UStaticMeshComponent*> Parts;
		GetComponents<UStaticMeshComponent>(Parts);
		for (UStaticMeshComponent* P : Parts)
		{
			for (const TPair<FName, UMaterialInstanceDynamic*>& Pair : Paints)
			{
				if (P->ComponentHasTag(Pair.Key))
				{
					P->SetMaterial(0, Pair.Value);
					break;
				}
			}
		}
	}

	// line number on the destination display
	if (UStaticMeshComponent* Cab = Modules.Num() ? Modules[0].Get() : nullptr)
	{
		UTextRenderComponent* Number = NewObject<UTextRenderComponent>(this, TEXT("LineNumber"));
		Number->SetupAttachment(Cab);
		Number->SetUsingAbsoluteScale(true);
		Number->RegisterComponent();
		const float L = ModuleLength(0);
		Number->SetRelativeLocation(FVector((L / 2 + 9.f) / L * 100.f, 0.f, (Height / 2 - 22.f) / Height * 100.f));
		Number->SetText(FText::FromString(Line));
		Number->SetHorizontalAlignment(EHTA_Center);
		Number->SetVerticalAlignment(EVRTA_TextCenter);
		Number->SetWorldSize(24.f);
		Number->SetTextRenderColor(FColor(255, 170, 30));
		Number->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}
	Place();
}

void AGttTram::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!Path)
	{
		return;
	}
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	const float Length = Path->GetSplineLength();

	// target speed: stops, then obstacles (browser game: src/entities/trams.js, updateTrams)
	float Target = TopSpeed;
	if (Dwell > 0.f)
	{
		Dwell -= Dt;
		Target = 0.f;
	}
	else
	{
		const float* Next = Stops.FindByPredicate([this](float Stop) { return Stop > LastStop + 400.f && Stop > S - 60.f; });
		if (Next)
		{
			const float D = *Next - S;
			if (D < 100.f && Speed < 200.f)
			{
				Dwell = FMath::FRandRange(10.f, 15.f);
				LastStop = *Next;
				Target = 0.f;
			}
			else
			{
				Target = FMath::Min(Target, FMath::Sqrt(FMath::Max(0.f, D) * 2.f * ServiceBraking * 0.8f) + 100.f);
			}
		}
	}

	const float Obstacle = ObstacleDistance();
	if (Obstacle < LookAhead)
	{
		// stop about 3 m before it
		Target = FMath::Min(Target, FMath::Max(0.f, (Obstacle - 300.f) * 1.5f));
	}

	if (Speed < Target)
	{
		Speed = FMath::Min(Target, Speed + Acceleration * Dt);
	}
	else
	{
		Speed = FMath::Max(Target, Speed - (Obstacle < 900.f ? EmergencyBraking : ServiceBraking) * Dt);
	}
	S += Speed * Dt;

	// end of the line: start again from its beginning
	if (S > Length - 100.f)
	{
		S = TotalLength() + 100.f;
		Speed = 0.f;
		LastStop = -1e9f;
	}
	Place();
}

float AGttTram::ObstacleDistance() const
{
	const FVector Ahead = Path->GetLocationAtDistanceAlongSpline(S, ESplineCoordinateSpace::World);
	const FVector Dir = Path->GetDirectionAtDistanceAlongSpline(S, ESplineCoordinateSpace::World).GetSafeNormal2D();
	const FVector Start = Ahead + Dir * 100.f + FVector(0, 0, FloorHeight + Height / 2);
	const FVector End = Start + Dir * LookAhead;

	FCollisionObjectQueryParams Objects;
	Objects.AddObjectTypesToQuery(ECC_Pawn);
	Objects.AddObjectTypesToQuery(ECC_Vehicle);
	Objects.AddObjectTypesToQuery(ECC_PhysicsBody);
	Objects.AddObjectTypesToQuery(ECC_WorldDynamic);
	FCollisionQueryParams Params(SCENE_QUERY_STAT(GttTramAhead), false, this);

	FHitResult Hit;
	const FCollisionShape Box = FCollisionShape::MakeBox(FVector(50.f, Width / 2 + 10.f, Height / 2 - 20.f));
	if (GetWorld()->SweepSingleByObjectType(Hit, Start, End, Dir.ToOrientationQuat(), Objects, Box, Params))
	{
		return Hit.Distance + 100.f;
	}
	return TNumericLimits<float>::Max();
}

void AGttTram::Place()
{
	// the root follows the front (for the camera, sound, debugging); the modules use absolute transforms
	SetActorLocation(Path->GetLocationAtDistanceAlongSpline(S, ESplineCoordinateSpace::World), false, nullptr, ETeleportType::None);
	float D = S;
	for (int32 i = 0; i < Modules.Num(); ++i)
	{
		const float L = ModuleLength(i);
		PlaceModule(Modules[i], D, L);
		D -= L + Gap;
	}
}

void AGttTram::PlaceModule(UStaticMeshComponent* Module, float FrontDistance, float Length)
{
	// each module sits on the chord between its two ends, so the tram bends on curves
	const FVector A = Path->GetLocationAtDistanceAlongSpline(FMath::Max(0.f, FrontDistance), ESplineCoordinateSpace::World);
	const FVector B = Path->GetLocationAtDistanceAlongSpline(FMath::Max(0.f, FrontDistance - Length), ESplineCoordinateSpace::World);
	const FVector Mid = (A + B) / 2 + FVector(0, 0, FloorHeight + Height / 2);
	const FRotator Rot = (A - B).IsNearlyZero() ? Module->GetComponentRotation() : (A - B).GetSafeNormal2D().Rotation();
	Module->SetWorldLocationAndRotation(Mid, Rot, false, nullptr, ETeleportType::None);
}
