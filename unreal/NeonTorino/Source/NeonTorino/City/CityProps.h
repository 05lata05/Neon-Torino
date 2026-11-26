// Street life from the OpenStreetMap export (unreal/import/santa_rita_data.json): the 666 mapped trees, street
// lamps, benches, waste bins, GTT bus and tram stops, and the signs of the real shops and venues.
//
// Spawned automatically in the SantaRita level by UTransitSubsystem; it can also be placed by hand.
//
// Real data: positions of every object, shop names and categories.
// Placement fixes: objects mapped on the carriageway (many OSM bus stops) are moved onto the sidewalk, and nothing
// is left within 2–2.5 m of a tram track (tram shelters face the track with the platform edge 2 m from it).
// Props block cars and people but are static: the trams' look-ahead ignores them.
// Invented details: all shapes are simple placeholders built from Unreal's basic shapes until real models
// exist (tree heights 7–12 m with a seeded random variation, lamps 7 m, benches, bins, stop poles and tram
// shelters); benches and stops face the nearest street; a shop sign is put on the first wall met going from
// the nearest street towards the shop's mapped point, 3.2 m up, with a colour chosen by category.
// The meshes can be swapped for real models in the Details panel (TreeTrunkMesh, TreeCrownMesh…).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SantaRitaData.h"
#include "CityProps.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

UCLASS()
class ACityProps : public AActor
{
	GENERATED_BODY()

public:
	ACityProps();

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	FString DataFile = TEXT("../import/santa_rita_data.json");

	// -1: automatic (see SantaRitaData.h); 0..7: forced
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	int32 AxisMode = -1;

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	bool bShopSigns = true;

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	TObjectPtr<UStaticMesh> TreeTrunkMesh;

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	TObjectPtr<UStaticMesh> TreeCrownMesh;

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY(VisibleAnywhere)
	TObjectPtr<USceneComponent> Root;

	UPROPERTY()
	TObjectPtr<UStaticMesh> Cube;

	UPROPERTY()
	TObjectPtr<UStaticMesh> Cylinder;

	UPROPERTY()
	TObjectPtr<UStaticMesh> Sphere;

	FSantaRitaData Data;
	TArray<FVector2D> RoadA, RoadB; // street segments (Unreal XY, cm) to face things towards the street
	TArray<float> RoadHalfWidth;    // half the carriageway width of each segment (cm), as drawn by the exporter
	TArray<FVector2D> TrackA, TrackB; // tram track segments (Unreal XY, cm): props are kept clear of them

	// nearest point on a segment list; returns the index of the segment, or INDEX_NONE
	static int32 Nearest(const TArray<FVector2D>& A, const TArray<FVector2D>& B, const FVector2D& P, FVector2D& OutPoint);
	// a point mapped on the carriageway (OSM bus stops often are) is moved onto the sidewalk on the same side
	FVector OntoSidewalk(const FVector& Point) const;
	// a point closer than Clearance to a tram track is pushed away from it, so trams pass freely
	FVector ClearOfTracks(const FVector& Point, float Clearance) const;

	UInstancedStaticMeshComponent* MakeInstances(UStaticMesh* Mesh, const FLinearColor& Colour, bool bCollision = false);
	float GroundZ(const FVector& Point) const;
	FVector NearestStreetPoint(const FVector& Point) const;
	float YawTowardsStreet(const FVector& Point) const;

	void LoadStreets();
	void PlaceTrees();
	void PlaceFurniture();
	void PlaceStops();
	void PlaceShopSigns();
};
