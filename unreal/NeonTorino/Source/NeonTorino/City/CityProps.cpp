#include "CityProps.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Math/RandomStream.h"
#include "UObject/ConstructorHelpers.h"

DEFINE_LOG_CATEGORY_STATIC(LogCityProps, Log, All);

ACityProps::ACityProps()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeFinder(TEXT("/Engine/BasicShapes/Cube.Cube"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderFinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereFinder(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	Cube = CubeFinder.Object;
	Cylinder = CylinderFinder.Object;
	Sphere = SphereFinder.Object;
}

void ACityProps::BeginPlay()
{
	Super::BeginPlay();
	if (!Data.Load(GetWorld(), DataFile, AxisMode))
	{
		return;
	}
	LoadStreets();
	PlaceTrees();
	PlaceFurniture();
	PlaceStops();
	if (bShopSigns)
	{
		PlaceShopSigns();
	}
}

UInstancedStaticMeshComponent* ACityProps::MakeInstances(UStaticMesh* Mesh, const FLinearColor& Colour, bool bCollision)
{
	UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
	C->SetupAttachment(Root);
	C->SetStaticMesh(Mesh);
	C->SetCollisionEnabled(bCollision ? ECollisionEnabled::QueryAndPhysics : ECollisionEnabled::NoCollision);
	C->RegisterComponent();
	if (UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")))
	{
		UMaterialInstanceDynamic* M = UMaterialInstanceDynamic::Create(Base, this);
		M->SetVectorParameterValue(TEXT("Color"), Colour);
		C->SetMaterial(0, M);
	}
	return C;
}

float ACityProps::GroundZ(const FVector& Point) const
{
	// the top of whatever static surface is there: road, sidewalk, park, ground
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(CityPropsGround), false, this);
	const FVector Start(Point.X, Point.Y, 5000.f), End(Point.X, Point.Y, -1000.f);
	if (GetWorld()->LineTraceSingleByObjectType(Hit, Start, End, FCollisionObjectQueryParams(ECC_WorldStatic), Params))
	{
		return Hit.ImpactPoint.Z;
	}
	return 0.f;
}

void ACityProps::LoadStreets()
{
	TArray<FVector2D> Nodes;
	for (const TSharedPtr<FJsonValue>& N : Data.Array(TEXT("roadGraph"), TEXT("nodes")))
	{
		double E, S;
		if (FSantaRitaData::ReadPoint(N, E, S))
		{
			const FVector W = Data.ToWorld(E, S);
			Nodes.Emplace(W.X, W.Y);
		}
	}
	for (const TSharedPtr<FJsonValue>& Edge : Data.Array(TEXT("roadGraph"), TEXT("edges")))
	{
		const TArray<TSharedPtr<FJsonValue>>& E = Edge->AsArray();
		if (E.Num() >= 2)
		{
			const int32 A = int32(E[0]->AsNumber()), B = int32(E[1]->AsNumber());
			if (A < B && Nodes.IsValidIndex(A) && Nodes.IsValidIndex(B)) // one per two-way pair is enough
			{
				RoadA.Add(Nodes[A]);
				RoadB.Add(Nodes[B]);
			}
			else if (A > B && Nodes.IsValidIndex(A) && Nodes.IsValidIndex(B))
			{
				RoadA.Add(Nodes[B]);
				RoadB.Add(Nodes[A]);
			}
		}
	}
}

FVector ACityProps::NearestStreetPoint(const FVector& Point) const
{
	const FVector2D P(Point.X, Point.Y);
	FVector2D Best = P;
	double BestD = TNumericLimits<double>::Max();
	for (int32 i = 0; i < RoadA.Num(); ++i)
	{
		const FVector2D A = RoadA[i], AB = RoadB[i] - A;
		const double L2 = AB.SizeSquared();
		const double T = L2 > 0 ? FMath::Clamp(FVector2D::DotProduct(P - A, AB) / L2, 0.0, 1.0) : 0.0;
		const FVector2D Q = A + AB * T;
		const double D = FVector2D::DistSquared(P, Q);
		if (D < BestD)
		{
			BestD = D;
			Best = Q;
		}
	}
	return FVector(Best.X, Best.Y, Point.Z);
}

float ACityProps::YawTowardsStreet(const FVector& Point) const
{
	const FVector D = NearestStreetPoint(Point) - Point;
	return D.SizeSquared2D() > 1.f ? D.Rotation().Yaw : 0.f;
}

void ACityProps::PlaceTrees()
{
	UInstancedStaticMeshComponent* Trunks = MakeInstances(TreeTrunkMesh ? TreeTrunkMesh.Get() : Cylinder.Get(), FLinearColor(0.20f, 0.13f, 0.08f), true);
	UInstancedStaticMeshComponent* CrownsA = MakeInstances(TreeCrownMesh ? TreeCrownMesh.Get() : Sphere.Get(), FLinearColor(0.10f, 0.28f, 0.06f));
	UInstancedStaticMeshComponent* CrownsB = MakeInstances(TreeCrownMesh ? TreeCrownMesh.Get() : Sphere.Get(), FLinearColor(0.16f, 0.33f, 0.08f));
	FRandomStream Random(1774);
	int32 Count = 0;
	for (const TSharedPtr<FJsonValue>& T : Data.Array(TEXT("streetFurniture"), TEXT("trees")))
	{
		double E, S;
		if (!FSantaRitaData::ReadPosition(T->AsObject(), E, S))
		{
			continue;
		}
		FVector P = Data.ToWorld(E, S);
		P.Z = GroundZ(P);
		const float H = Random.FRandRange(700.f, 1200.f); // cm
		const float Yaw = Random.FRandRange(0.f, 360.f);
		// basic shapes are 100 cm and centred: trunk 35 cm wide up to 45% of the height, crown 55% of the height wide
		Trunks->AddInstance(FTransform(FRotator(0, Yaw, 0), P + FVector(0, 0, H * 0.225f), FVector(0.35f, 0.35f, H * 0.45f / 100.f)), true);
		const float C = H * 0.55f / 100.f;
		(Count % 2 ? CrownsA : CrownsB)->AddInstance(FTransform(FRotator(0, Yaw, 0), P + FVector(0, 0, H * 0.68f), FVector(C, C, C * 0.9f)), true);
		++Count;
	}
	UE_LOG(LogCityProps, Log, TEXT("City props: %d trees"), Count);
}

void ACityProps::PlaceFurniture()
{
	// street lamps: 7 m grey pole with an arm and a lamp towards the street
	UInstancedStaticMeshComponent* Poles = MakeInstances(Cylinder, FLinearColor(0.25f, 0.26f, 0.27f), true);
	UInstancedStaticMeshComponent* Heads = MakeInstances(Cube, FLinearColor(0.85f, 0.85f, 0.75f));
	for (const TSharedPtr<FJsonValue>& L : Data.Array(TEXT("streetFurniture"), TEXT("streetLamps")))
	{
		double E, S;
		if (!FSantaRitaData::ReadPosition(L->AsObject(), E, S))
		{
			continue;
		}
		FVector P = Data.ToWorld(E, S);
		P.Z = GroundZ(P);
		const FRotator Face(0, YawTowardsStreet(P), 0);
		Poles->AddInstance(FTransform(FRotator::ZeroRotator, P + FVector(0, 0, 350.f), FVector(0.16f, 0.16f, 7.f)), true);
		Poles->AddInstance(FTransform(Face, P + Face.Vector() * 60.f + FVector(0, 0, 690.f), FVector(1.3f, 0.08f, 0.08f)), true);
		Heads->AddInstance(FTransform(Face, P + Face.Vector() * 120.f + FVector(0, 0, 675.f), FVector(0.55f, 0.25f, 0.15f)), true);
	}

	// benches: seat and back, facing the street
	UInstancedStaticMeshComponent* Wood = MakeInstances(Cube, FLinearColor(0.30f, 0.17f, 0.08f), true);
	for (const TSharedPtr<FJsonValue>& B : Data.Array(TEXT("streetFurniture"), TEXT("benches")))
	{
		double E, S;
		if (!FSantaRitaData::ReadPosition(B->AsObject(), E, S))
		{
			continue;
		}
		FVector P = Data.ToWorld(E, S);
		P.Z = GroundZ(P);
		const FRotator Face(0, YawTowardsStreet(P), 0);
		const FVector Back = -Face.Vector();
		Wood->AddInstance(FTransform(Face, P + FVector(0, 0, 45.f), FVector(0.5f, 1.8f, 0.08f)), true);
		Wood->AddInstance(FTransform(Face, P + Back * 25.f + FVector(0, 0, 70.f), FVector(0.06f, 1.8f, 0.4f)), true);
		Wood->AddInstance(FTransform(Face, P + FVector(0, 0, 22.f), FVector(0.4f, 1.6f, 0.44f)), true);
	}

	// waste bins
	UInstancedStaticMeshComponent* Bins = MakeInstances(Cylinder, FLinearColor(0.05f, 0.20f, 0.10f), true);
	for (const TSharedPtr<FJsonValue>& W : Data.Array(TEXT("streetFurniture"), TEXT("wasteBins")))
	{
		double E, S;
		if (FSantaRitaData::ReadPosition(W->AsObject(), E, S))
		{
			FVector P = Data.ToWorld(E, S);
			P.Z = GroundZ(P);
			Bins->AddInstance(FTransform(FRotator::ZeroRotator, P + FVector(0, 0, 45.f), FVector(0.5f, 0.5f, 0.9f)), true);
		}
	}
}

void ACityProps::PlaceStops()
{
	// bus stops: pole with a sign; tram stops: a shelter with roof and back panel
	UInstancedStaticMeshComponent* Poles = MakeInstances(Cylinder, FLinearColor(0.55f, 0.56f, 0.58f), true);
	UInstancedStaticMeshComponent* Signs = MakeInstances(Cube, FLinearColor(0.95f, 0.70f, 0.02f));
	UInstancedStaticMeshComponent* Shelters = MakeInstances(Cube, FLinearColor(0.30f, 0.33f, 0.36f), true);
	int32 Bus = 0, Tram = 0;
	for (const TSharedPtr<FJsonValue>& B : Data.Array(TEXT("busStops")))
	{
		double E, S;
		if (!FSantaRitaData::ReadPosition(B->AsObject(), E, S))
		{
			continue;
		}
		FVector P = Data.ToWorld(E, S);
		P.Z = GroundZ(P);
		const FRotator Face(0, YawTowardsStreet(P), 0);
		Poles->AddInstance(FTransform(FRotator::ZeroRotator, P + FVector(0, 0, 140.f), FVector(0.08f, 0.08f, 2.8f)), true);
		Signs->AddInstance(FTransform(Face, P + FVector(0, 0, 260.f), FVector(0.04f, 0.5f, 0.35f)), true);
		++Bus;
	}
	for (const TSharedPtr<FJsonValue>& T : Data.Array(TEXT("tramStops")))
	{
		double E, S;
		if (!FSantaRitaData::ReadPosition(T->AsObject(), E, S))
		{
			continue;
		}
		FVector P = Data.ToWorld(E, S);
		P.Z = GroundZ(P);
		const FRotator Face(0, YawTowardsStreet(P), 0);
		const FVector Back = -Face.Vector();
		Shelters->AddInstance(FTransform(Face, P + FVector(0, 0, 260.f), FVector(1.6f, 4.f, 0.1f)), true);              // roof
		Shelters->AddInstance(FTransform(Face, P + Back * 75.f + FVector(0, 0, 130.f), FVector(0.05f, 4.f, 2.4f)), true); // back panel
		Signs->AddInstance(FTransform(Face, P + Face.Vector() * 60.f + FVector(0, 0, 290.f), FVector(0.04f, 1.f, 0.4f)), true);
		++Tram;
	}
	UE_LOG(LogCityProps, Log, TEXT("City props: %d bus stops, %d tram stops"), Bus, Tram);
}

void ACityProps::PlaceShopSigns()
{
	// board colour by category (invented, for readability)
	struct FKind
	{
		const TCHAR* Match;
		FLinearColor Colour;
	};
	static const FKind Kinds[] = {
		{TEXT("pharmacy"), FLinearColor(0.02f, 0.45f, 0.12f)},
		{TEXT("bar"), FLinearColor(0.45f, 0.04f, 0.05f)},
		{TEXT("cafe"), FLinearColor(0.45f, 0.04f, 0.05f)},
		{TEXT("restaurant"), FLinearColor(0.30f, 0.08f, 0.04f)},
		{TEXT("fast_food"), FLinearColor(0.60f, 0.25f, 0.02f)},
		{TEXT("bakery"), FLinearColor(0.55f, 0.32f, 0.08f)},
		{TEXT("tobacco"), FLinearColor(0.05f, 0.08f, 0.25f)},
		{TEXT("supermarket"), FLinearColor(0.75f, 0.10f, 0.05f)},
		{TEXT("hairdresser"), FLinearColor(0.35f, 0.10f, 0.35f)},
		{TEXT("bank"), FLinearColor(0.08f, 0.15f, 0.35f)},
	};
	TArray<UInstancedStaticMeshComponent*> Boards;
	for (const FKind& K : Kinds)
	{
		Boards.Add(MakeInstances(Cube, K.Colour));
	}
	UInstancedStaticMeshComponent* Default = MakeInstances(Cube, FLinearColor(0.10f, 0.12f, 0.16f));

	FCollisionQueryParams Params(SCENE_QUERY_STAT(CityPropsSigns), false, this);
	int32 Placed = 0, Missed = 0;
	for (const TSharedPtr<FJsonValue>& V : Data.Array(TEXT("shopSigns")))
	{
		const TSharedPtr<FJsonObject> Shop = V->AsObject();
		double E, S;
		FString Name, Category;
		if (!FSantaRitaData::ReadPosition(Shop, E, S) || !Shop->TryGetStringField(TEXT("name"), Name) || Name.IsEmpty())
		{
			continue;
		}
		Shop->TryGetStringField(TEXT("category"), Category);

		// from the nearest street towards the shop, 3.2 m up: the first wall met is the shop's facade
		const FVector Point = Data.ToWorld(E, S, 3.2);
		const FVector Street = NearestStreetPoint(Point);
		FVector Dir = Point - Street;
		Dir.Z = 0;
		if (!Dir.Normalize())
		{
			++Missed;
			continue;
		}
		FHitResult Hit;
		const FVector Start = Street + FVector(0, 0, 0) - Dir * 100.f;
		const FVector End = Point + Dir * 1500.f;
		if (!GetWorld()->LineTraceSingleByObjectType(Hit, Start, End, FCollisionObjectQueryParams(ECC_WorldStatic), Params) ||
			FVector::Dist2D(Hit.ImpactPoint, Point) > 4000.f)
		{
			++Missed;
			continue;
		}
		FVector Normal = Hit.ImpactNormal;
		Normal.Z = 0;
		if (!Normal.Normalize())
		{
			++Missed;
			continue;
		}
		const FRotator Face = Normal.Rotation();
		const FString Text = Name.Len() > 30 ? Name.Left(27) + TEXT("...") : Name;
		const float BoardWidth = FMath::Clamp(Text.Len() * 24.f + 60.f, 150.f, 650.f);

		UInstancedStaticMeshComponent* Board = Default;
		for (int32 k = 0; k < UE_ARRAY_COUNT(Kinds); ++k)
		{
			if (Category.Contains(Kinds[k].Match))
			{
				Board = Boards[k];
				break;
			}
		}
		const FVector At = Hit.ImpactPoint + Normal * 6.f;
		Board->AddInstance(FTransform(Face, At, FVector(0.08f, BoardWidth / 100.f, 0.6f)), true);

		UTextRenderComponent* Label = NewObject<UTextRenderComponent>(this);
		Label->SetupAttachment(Root);
		Label->RegisterComponent();
		Label->SetWorldLocationAndRotation(At + Normal * 6.f, Face);
		Label->SetText(FText::FromString(Text));
		Label->SetHorizontalAlignment(EHTA_Center);
		Label->SetVerticalAlignment(EVRTA_TextCenter);
		Label->SetWorldSize(34.f);
		Label->SetTextRenderColor(FColor::White);
		Label->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		++Placed;
	}
	UE_LOG(LogCityProps, Log, TEXT("City props: %d shop signs placed, %d without a wall nearby"), Placed, Missed);
}
