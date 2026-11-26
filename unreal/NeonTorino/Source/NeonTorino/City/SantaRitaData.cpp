#include "SantaRitaData.h"

#include "Dom/JsonObject.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

DEFINE_LOG_CATEGORY_STATIC(LogSantaRitaData, Log, All);

namespace
{
	constexpr double GroundMarginM = 80.0; // tools/export_gltf.mjs: the ground covers every road + 80 m
	const TArray<TSharedPtr<FJsonValue>> EmptyArray;
}

bool FSantaRitaData::Load(UWorld* World, const FString& RelativeFile, int32 ForcedAxis)
{
	const FString Path = FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectDir(), RelativeFile));
	FString Text;
	if (!FFileHelper::LoadFileToString(Text, *Path))
	{
		UE_LOG(LogSantaRitaData, Warning, TEXT("Santa Rita data not found: %s (run npm run unreal)"), *Path);
		return false;
	}
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		UE_LOG(LogSantaRitaData, Warning, TEXT("Cannot read %s"), *Path);
		return false;
	}
	if (ForcedAxis >= 0)
	{
		AxisMode = FMath::Clamp(ForcedAxis, 0, 7);
	}
	else
	{
		ChooseAxisMode(World);
	}
	return true;
}

FVector FSantaRitaData::ToWorld(double East, double South, double Up) const
{
	const bool bSwap = (AxisMode & 4) != 0;
	const double SignX = (AxisMode & 1) ? -1.0 : 1.0;
	const double SignY = (AxisMode & 2) ? -1.0 : 1.0;
	const double A = bSwap ? South : East;
	const double B = bSwap ? East : South;
	return FVector(SignX * A * 100.0, SignY * B * 100.0, Up * 100.0);
}

bool FSantaRitaData::ReadPoint(const TSharedPtr<FJsonValue>& Value, double& OutA, double& OutB)
{
	if (!Value.IsValid() || Value->Type != EJson::Array)
	{
		return false;
	}
	const TArray<TSharedPtr<FJsonValue>>& P = Value->AsArray();
	if (P.Num() < 2)
	{
		return false;
	}
	OutA = P[0]->AsNumber();
	OutB = P[1]->AsNumber();
	return true;
}

bool FSantaRitaData::ReadPosition(const TSharedPtr<FJsonObject>& Object, double& OutEast, double& OutSouth)
{
	return Object.IsValid() && ReadPoint(Object->TryGetField(TEXT("position")), OutEast, OutSouth);
}

TArray<FVector2D> FSantaRitaData::ReadPolyline(const TSharedPtr<FJsonValue>& Value)
{
	TArray<FVector2D> Out;
	if (Value.IsValid() && Value->Type == EJson::Array)
	{
		for (const TSharedPtr<FJsonValue>& P : Value->AsArray())
		{
			double A, B;
			if (ReadPoint(P, A, B))
			{
				Out.Emplace(A, B);
			}
		}
	}
	return Out;
}

const TArray<TSharedPtr<FJsonValue>>& FSantaRitaData::Array(const TCHAR* Field, const TCHAR* Child) const
{
	if (!Root.IsValid())
	{
		return EmptyArray;
	}
	const TArray<TSharedPtr<FJsonValue>>* Out = nullptr;
	if (Child)
	{
		const TSharedPtr<FJsonObject>* Object = nullptr;
		if (Root->TryGetObjectField(Field, Object) && (*Object)->TryGetArrayField(Child, Out))
		{
			return *Out;
		}
		return EmptyArray;
	}
	return Root->TryGetArrayField(Field, Out) ? *Out : EmptyArray;
}

void FSantaRitaData::ChooseAxisMode(UWorld* World)
{
	AxisMode = 0;
	double E0 = TNumericLimits<double>::Max(), E1 = TNumericLimits<double>::Lowest();
	double S0 = E0, S1 = E1;
	for (const TSharedPtr<FJsonValue>& N : Array(TEXT("roadGraph"), TEXT("nodes")))
	{
		double E, S;
		if (ReadPoint(N, E, S))
		{
			E0 = FMath::Min(E0, E);
			E1 = FMath::Max(E1, E);
			S0 = FMath::Min(S0, S);
			S1 = FMath::Max(S1, S);
		}
	}
	FBox Ground(ForceInit);
	if (World)
	{
		for (TActorIterator<AStaticMeshActor> It(World); It; ++It)
		{
			const UStaticMeshComponent* C = It->GetStaticMeshComponent();
			if (C && C->GetStaticMesh() && C->GetStaticMesh()->GetName().Contains(TEXT("Ground")))
			{
				Ground += It->GetComponentsBoundingBox(true);
			}
		}
	}
	if (!Ground.IsValid || E0 > E1)
	{
		UE_LOG(LogSantaRitaData, Warning, TEXT("No imported Ground mesh found: axis mode 0 (props may be off the streets)"));
		return;
	}
	E0 -= GroundMarginM;
	E1 += GroundMarginM;
	S0 -= GroundMarginM;
	S1 += GroundMarginM;
	double BestError = TNumericLimits<double>::Max();
	int32 BestMode = 0;
	for (int32 Mode = 0; Mode < 8; ++Mode)
	{
		AxisMode = Mode;
		FBox Box(ForceInit);
		Box += ToWorld(E0, S0);
		Box += ToWorld(E1, S1);
		const double Error = FMath::Abs(Box.Min.X - Ground.Min.X) + FMath::Abs(Box.Max.X - Ground.Max.X) +
			FMath::Abs(Box.Min.Y - Ground.Min.Y) + FMath::Abs(Box.Max.Y - Ground.Max.Y);
		if (Error < BestError)
		{
			BestError = Error;
			BestMode = Mode;
		}
	}
	AxisMode = BestMode;
	UE_LOG(LogSantaRitaData, Log, TEXT("Santa Rita data: axis mode %d, ground match within %.1f m"), AxisMode, BestError / 400.0);
}
