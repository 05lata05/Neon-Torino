#include "GttTram.h"

#include "Components/SplineComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

AGttTram::AGttTram()
{
	PrimaryActorTick.bCanEverTick = true;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Root->SetMobility(EComponentMobility::Movable);
	RootComponent = Root;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	auto MakeSection = [this](const TCHAR* Name) // Cube is static: no capture needed
	{
		UStaticMeshComponent* C = CreateDefaultSubobject<UStaticMeshComponent>(Name);
		C->SetupAttachment(Root);
		C->SetMobility(EComponentMobility::Movable);
		// placed in world space every frame, independently of the actor's root
		C->SetUsingAbsoluteLocation(true);
		C->SetUsingAbsoluteRotation(true);
		if (Cube.Succeeded())
		{
			C->SetStaticMesh(Cube.Object);
		}
		// a cube is 100 cm
		C->SetRelativeScale3D(FVector(SectionLength / 100.f, Width / 100.f, Height / 100.f));
		C->SetCollisionProfileName(TEXT("BlockAllDynamic"));
		C->SetSimulatePhysics(false);
		return C;
	};
	Front = MakeSection(TEXT("FrontSection"));
	Rear = MakeSection(TEXT("RearSection"));
}

void AGttTram::Setup(USplineComponent* InPath, const TArray<float>& InStops, const FString& InLine, float Start)
{
	Path = InPath;
	Stops = InStops;
	Line = InLine;
	S = FMath::Max(Start, 2 * SectionLength + SectionGap + 100.f);
	Speed = 0.f;

	UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (Base)
	{
		UMaterialInstanceDynamic* Paint = UMaterialInstanceDynamic::Create(Base, this);
		Paint->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.85f, 0.32f, 0.05f)); // GTT orange
		Front->SetMaterial(0, Paint);
		Rear->SetMaterial(0, Paint);
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
		S = 2 * SectionLength + SectionGap + 100.f;
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
	// the root follows the front (for the camera, sound, debugging); the sections use absolute transforms
	SetActorLocation(Path->GetLocationAtDistanceAlongSpline(S, ESplineCoordinateSpace::World), false, nullptr, ETeleportType::None);
	PlaceSection(Front, S);
	PlaceSection(Rear, S - SectionLength - SectionGap);
}

void AGttTram::PlaceSection(UStaticMeshComponent* Section, float FrontDistance)
{
	// each section sits on the chord between its two ends, so the tram bends on curves
	const FVector A = Path->GetLocationAtDistanceAlongSpline(FMath::Max(0.f, FrontDistance), ESplineCoordinateSpace::World);
	const FVector B = Path->GetLocationAtDistanceAlongSpline(FMath::Max(0.f, FrontDistance - SectionLength), ESplineCoordinateSpace::World);
	const FVector Mid = (A + B) / 2 + FVector(0, 0, FloorHeight + Height / 2);
	const FRotator Rot = (A - B).IsNearlyZero() ? Section->GetComponentRotation() : (A - B).GetSafeNormal2D().Rotation();
	Section->SetWorldLocationAndRotation(Mid, Rot, false, nullptr, ETeleportType::None);
}
