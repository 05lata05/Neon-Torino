// A GTT tram of the Hitachi series 8000 (design Giugiaro), the trams of lines 4 and 10: five articulated modules
// following its line along the rails, stopping at the stops and braking for whatever is on the track ahead.
//
// Real data (GTT, Hitachi Rail, tramditorino.it): 28 m long, 2.40 m wide, 3.48 m tall; five modules on three
// bogies, cab modules and the middle one on bogies, the two suspended modules carry the doors; single-ended
// (one cab, doors on the right only); four double doors of 1.30 m; yellow and blue livery (the city's colours).
// Invented details: module lengths (7 + 4.4 + 5.6 + 4.4 + 6.4 m), the exact layout of the livery, the cab shape
// and all the parts are simple boxes until a Blender model exists; colours can be changed in the Details panel.
//
// The driving rules are ported from the browser game (src/entities/trams.js): stop when the next stop is less
// than about a metre away, wait, then go; slow down on a square-root curve before stops and obstacles; brake
// harder when something is very close; at the end of the line start again from its beginning. The browser
// game's numbers were tuned for its smaller scale; here they are real-world values: 50 km/h top speed,
// 1.2 m/s² acceleration, 1.5 m/s² service and 3 m/s² emergency braking, 10–15 s at each stop.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "GttTram.generated.h"

class USplineComponent;
class UStaticMeshComponent;

UCLASS()
class AGttTram : public AActor
{
	GENERATED_BODY()

public:
	AGttTram();

	// path: the line's track; stops: distances along it (cm); start: distance of the tram's front (cm)
	void Setup(USplineComponent* InPath, const TArray<float>& InStops, const FString& InLine, float Start);

	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	float TopSpeed = 1390.f; // cm/s, 50 km/h

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	float Acceleration = 120.f; // cm/s²

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	float ServiceBraking = 150.f; // cm/s²

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	float EmergencyBraking = 300.f; // cm/s²

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	float LookAhead = 3400.f; // cm: how far ahead the driver looks for obstacles

	// livery (approximate, see the header comment)
	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	FLinearColor Yellow = FLinearColor(0.95f, 0.70f, 0.02f);

	UPROPERTY(EditAnywhere, Category = "Neon Torino|Tram")
	FLinearColor Blue = FLinearColor(0.02f, 0.10f, 0.40f);

	UPROPERTY(VisibleAnywhere, Category = "Neon Torino|Tram")
	FString Line;

	static constexpr int32 NumModules = 5;

private:
	UPROPERTY(VisibleAnywhere)
	TObjectPtr<USceneComponent> Root;

	UPROPERTY(VisibleAnywhere)
	TArray<TObjectPtr<UStaticMeshComponent>> Modules;

	UPROPERTY()
	TObjectPtr<USplineComponent> Path;

	TArray<float> Stops;
	float S = 0.f;          // distance of the front along the path (cm)
	float Speed = 0.f;      // cm/s
	float Dwell = 0.f;      // seconds left at the current stop
	float LastStop = -1e9f; // distance of the last stop served

	static constexpr float Gap = 10.f;          // cm between modules (bellows)
	static constexpr float Width = 240.f;
	static constexpr float Height = 348.f;
	static constexpr float FloorHeight = 0.f;   // the boxes start at the rail top: low-floor tram
	static float ModuleLength(int32 Index);     // cm
	static float TotalLength();

	float ObstacleDistance() const;
	void Place();
	void PlaceModule(UStaticMeshComponent* Module, float FrontDistance, float Length);
};
