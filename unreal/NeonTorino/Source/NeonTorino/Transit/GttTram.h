// A GTT tram: two articulated sections following its line along the rails, stopping at the stops and braking
// for whatever is on the track ahead (cars, the player, people, other trams).
//
// The rules are ported from the browser game (src/entities/trams.js): stop when the next stop is less than
// about a metre away, wait, then go; slow down on a square-root curve before stops and obstacles; brake harder
// when something is very close; at the end of the line start again from its beginning.
//
// Invented details: the shape (two plain boxes, 10.4 m each, 2.4 m wide, 3.3 m tall, until a Blender model
// exists) and the classic GTT orange colour. The browser game's numbers were tuned for its smaller scale and
// arcade feel; here they are real-world values: 50 km/h top speed, 1.2 m/s² acceleration, 1.5 m/s² service and
// 3 m/s² emergency braking, 10–15 s at each stop.
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

	UPROPERTY(VisibleAnywhere, Category = "Neon Torino|Tram")
	FString Line;

private:
	UPROPERTY(VisibleAnywhere)
	TObjectPtr<USceneComponent> Root;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> Front;

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> Rear;

	UPROPERTY()
	TObjectPtr<USplineComponent> Path;

	TArray<float> Stops;
	float S = 0.f;          // distance of the front along the path (cm)
	float Speed = 0.f;      // cm/s
	float Dwell = 0.f;      // seconds left at the current stop
	float LastStop = -1e9f; // distance of the last stop served

	static constexpr float SectionLength = 1040.f;
	static constexpr float SectionGap = 40.f;
	static constexpr float Width = 240.f;
	static constexpr float Height = 330.f;
	static constexpr float FloorHeight = 30.f;

	float ObstacleDistance() const;
	void Place();
	void PlaceSection(UStaticMeshComponent* Section, float FrontDistance);
};
