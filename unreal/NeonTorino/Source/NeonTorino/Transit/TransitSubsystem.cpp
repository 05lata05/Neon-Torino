#include "TransitSubsystem.h"

#include "TramNetwork.h"
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
	for (TActorIterator<ATramNetwork> It(&InWorld); It; ++It)
	{
		return; // already placed in the level
	}
	FActorSpawnParameters Params;
	Params.Name = TEXT("GttTramNetwork");
	InWorld.SpawnActor<ATramNetwork>(ATramNetwork::StaticClass(), FTransform::Identity, Params);
}
