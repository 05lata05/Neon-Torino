// Copyright Epic Games, Inc. All Rights Reserved.

#include "NeonTorinoGameMode.h"
#include "NeonTorinoPlayerController.h"

ANeonTorinoGameMode::ANeonTorinoGameMode()
{
	PlayerControllerClass = ANeonTorinoPlayerController::StaticClass();
}
