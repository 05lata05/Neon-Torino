// Reads unreal/import/santa_rita_data.json (exported from OpenStreetMap by tools/export_gltf.mjs) and converts its
// positions to Unreal. Shared by the tram network and the street props.
//
// Positions in the file are metres [east, south] from the same origin as the imported city. The mapping to
// Unreal's X/Y is found by matching the road graph's extent (+80 m, the exporter's ground margin) with the
// bounds of the imported "Ground" mesh, among the 8 possible mappings (swap, two signs).
#pragma once

#include "CoreMinimal.h"

class FJsonObject;
class FJsonValue;
class UWorld;

struct FSantaRitaData
{
	TSharedPtr<FJsonObject> Root;
	int32 AxisMode = 0;

	// loads the file (relative to the project folder) and finds the axis mapping; ForcedAxis 0..7 skips the search
	bool Load(UWorld* World, const FString& RelativeFile = TEXT("../import/santa_rita_data.json"), int32 ForcedAxis = -1);

	// data metres [east, south] (and metres up) → Unreal world, centimetres
	FVector ToWorld(double East, double South, double Up = 0.0) const;

	// "position": [east, south] of a JSON object
	static bool ReadPosition(const TSharedPtr<FJsonObject>& Object, double& OutEast, double& OutSouth);
	static bool ReadPoint(const TSharedPtr<FJsonValue>& Value, double& OutA, double& OutB);
	static TArray<FVector2D> ReadPolyline(const TSharedPtr<FJsonValue>& Value);

	// array field of the root, or of a child object (e.g. "streetFurniture" / "trees"); empty if missing
	const TArray<TSharedPtr<FJsonValue>>& Array(const TCHAR* Field, const TCHAR* Child = nullptr) const;

private:
	void ChooseAxisMode(UWorld* World);
};
