// Puts the GTT tram network and the street props (trees, lamps, benches, bins, stops, shop signs) into the
// SantaRita level when play starts, so nobody has to place them by hand. If one is already in the level
// (placed to tweak its settings), that one is used.
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TransitSubsystem.generated.h"

UCLASS()
class UTransitSubsystem : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
	virtual void OnWorldBeginPlay(UWorld& InWorld) override;
};
