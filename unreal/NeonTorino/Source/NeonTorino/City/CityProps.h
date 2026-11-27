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
//
// Mesh slots (art/ASSETS.md, street furniture A2): every prop has a slot for its art model. A slot left empty is
// filled at BeginPlay with the asset of the same name imported by unreal/scripts/import_art.py anywhere under
// /Game/Art (e.g. SM_Lamp_Turin_A), so the spawned actor picks the art up without touching the level; if that is
// missing too, the placeholder shapes above are drawn. Art models are placed by their contract pivot and front
// (+X): lamps with the arm, benches with the seat, stop poles with the sign and bins with the opening towards the
// nearest street, shelters with the open side towards the track. Trees pick their species from the OSM `genus`
// when mapped (TreeSpecies, Tilia first: it is the default for untagged trees and for genera without a model),
// a variant per tree with the seeded random, and a scale of 0.7–1.2. Invented: the bins' facing.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SantaRitaData.h"
#include "CityProps.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

// one tree species: the OSM genus it stands for and its model variants (art/ASSETS.md: SM_Tree_<Genus>_A, _B…)
USTRUCT(BlueprintType)
struct FCityTreeSpecies
{
	GENERATED_BODY()

	// OSM `genus` value, compared without case (Tilia, Platanus…)
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	FString Genus;

	// asset names looked up under /Game/Art when Meshes is empty
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	TArray<FName> ArtNames;

	// model variants; empty: ArtNames from /Game/Art, else the placeholder trunk and crown
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props")
	TArray<TObjectPtr<UStaticMesh>> Meshes;
};

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

	// the first entry is the default species (lime, the most common in Santa Rita)
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TArray<FCityTreeSpecies> TreeSpecies;

	// SM_Lamp_Turin_A: pole 7.0 m, arm 1.3 m towards front; pivot at the base of the pole
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TObjectPtr<UStaticMesh> LampMesh;

	// SM_Bench_Turin: 1.8 × 0.5 m, seat 0.45 m; pivot at the centre of the base, seat side front
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TObjectPtr<UStaticMesh> BenchMesh;

	// SM_Bin_Street: Ø 0.5 m, 0.9 m tall; pivot at the base centre, opening front
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TObjectPtr<UStaticMesh> BinMesh;

	// SM_GTT_StopPole: 2.8 m, sign 0.5 × 0.35 m; pivot at the base, sign face front
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TObjectPtr<UStaticMesh> StopPoleMesh;

	// SM_GTT_TramShelter: 4.0 × 1.6 × 2.6 m; pivot at the centre of the base, open side front
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Props|Meshes")
	TObjectPtr<UStaticMesh> TramShelterMesh;

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

	// placeholder instances: a basic shape with a flat colour
	UInstancedStaticMeshComponent* MakeInstances(UStaticMesh* Mesh, const FLinearColor& Colour, bool bCollision = false);
	// art instances: the model with its own materials and collision
	UInstancedStaticMeshComponent* MakeMeshInstances(UStaticMesh* Mesh, bool bCollision);
	// fills the empty slots with the art imported under /Game/Art, by contract name
	void FindArtMeshes();
	static UStaticMesh* FindArtMesh(const TMap<FName, FSoftObjectPath>& Art, FName Name);
	float GroundZ(const FVector& Point) const;
	FVector NearestStreetPoint(const FVector& Point) const;
	float YawTowardsStreet(const FVector& Point) const;

	void LoadStreets();
	void PlaceTrees();
	void PlaceFurniture();
	void PlaceStops();
	void PlaceShopSigns();
};
