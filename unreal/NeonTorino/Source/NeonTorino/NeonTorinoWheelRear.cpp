// Copyright Epic Games, Inc. All Rights Reserved.

#include "NeonTorinoWheelRear.h"
#include "UObject/ConstructorHelpers.h"

UNeonTorinoWheelRear::UNeonTorinoWheelRear()
{
	AxleType = EAxleType::Rear;
	bAffectedByHandbrake = true;
	bAffectedByEngine = true;
}