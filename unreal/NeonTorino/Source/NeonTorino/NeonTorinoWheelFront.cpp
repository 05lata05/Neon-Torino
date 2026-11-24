// Copyright Epic Games, Inc. All Rights Reserved.

#include "NeonTorinoWheelFront.h"
#include "UObject/ConstructorHelpers.h"

UNeonTorinoWheelFront::UNeonTorinoWheelFront()
{
	AxleType = EAxleType::Front;
	bAffectedBySteering = true;
	MaxSteerAngle = 40.f;
}