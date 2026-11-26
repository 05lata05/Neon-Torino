#include "TransitSubsystem.h"

#include "TramNetwork.h"
#include "CityProps.h"
#include "Engine/World.h"
#include "EngineUtils.h"

bool UTransitSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
	// only while playing (game or Play In Editor), not in the editor's own world
	const UWorld* World = Cast<UWorld>(Outer);
	return World && (World->WorldType == EWorldType::Game || World->WorldType == EWorldType::PIE);
}

void UTransitSubsystem::OnWorldBeginPlay(UWorld& InWorld)
{
	Super::OnWorldBeginPlay(InWorld);
	if (!InWorld.GetMapName().Contains(TEXT("SantaRita")))
	{
		return;
	}
	// spawn each one unless it was already placed in the level (to tweak its settings)
	if (!TActorIterator<ATramNetwork>(&InWorld))
	{
		InWorld.SpawnActor<ATramNetwork>(ATramNetwork::StaticClass(), FTransform::Identity);
	}
	if (!TActorIterator<ACityProps>(&InWorld))
	{
		InWorld.SpawnActor<ACityProps>(ACityProps::StaticClass(), FTransform::Identity);
	}
}
