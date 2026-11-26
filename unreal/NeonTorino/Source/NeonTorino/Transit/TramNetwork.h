// GTT tram network of Santa Rita: reads the tram tracks, lines and stops exported from OpenStreetMap
// (unreal/import/santa_rita_data.json), draws the rails and runs the trams of lines 4 and 10 on them.
//
// Spawned automatically in the SantaRita level by UTransitSubsystem; it can also be placed by hand.
//
// Real data: track geometry, line routes (both directions of 4 and 10), stop positions and names.
// Invented details: the rails are plain steel bars (standard gauge 1435 mm, as in Turin), two trams per line
// direction, the tram shape and colour (see GttTram.h).
//
// Coordinates: see City/SantaRitaData.h (the axis mapping is found automatically; AxisMode 0..7 forces one).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SantaRitaData.h"
#include "TramNetwork.generated.h"

class UInstancedStaticMeshComponent;
class USplineComponent;
class AGttTram;

USTRUCT()
struct FTramLineRoute
{
	GENERATED_BODY()

	UPROPERTY()
	FString Line;

	UPROPERTY()
	TObjectPtr<USplineComponent> Path = nullptr;

	// distances along the path (cm) where the tram stops
	TArray<float> Stops;
};

UCLASS()
class ATramNetwork : public AActor
{
	GENERATED_BODY()

public:
	ATramNetwork();

	// data file, relative to the project folder (unreal/NeonTorino/)
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Trams")
	FString DataFile = TEXT("../import/santa_rita_data.json");

	// -1: find the axis mapping automatically; 0..7: force one (see ToWorld)
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Trams")
	int32 AxisMode = -1;

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Trams")
	int32 TramsPerRoute = 2;

	// height of the rail tops above the ground (cm): the exported roads are 8 cm above it
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Trams")
	float RailHeight = 12.f;

	const TArray<FTramLineRoute>& GetRoutes() const { return Routes; }

	// data metres [east, south] → Unreal world (cm)
	FVector ToWorld(double East, double South, double Up = 0.0) const { return Data.ToWorld(East, South, Up); }

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY(VisibleAnywhere)
	TObjectPtr<USceneComponent> Root;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UInstancedStaticMeshComponent> Rails;

	UPROPERTY()
	TArray<FTramLineRoute> Routes;

	UPROPERTY()
	TArray<TObjectPtr<AGttTram>> Trams;

	FSantaRitaData Data;

	void BuildRails();
	void BuildRoutes();
	void SpawnTrams();
};
