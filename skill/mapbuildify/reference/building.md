# Build-script pattern for mapbuildify

Run these as edit-mode Luau through the connected Studio MCP. Each pass is its own script, so a
failure only loses one pass. Re-running a pass should replace its folder, not duplicate it.

## Root model and undo

```lua
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local MAP_NAME = "MapBuildify_ForestRiver"
local root = workspace:FindFirstChild(MAP_NAME) or Instance.new("Model")
root.Name = MAP_NAME
root.Parent = workspace

local function zone(name)
	local old = root:FindFirstChild(name)
	if old then old:Destroy() end
	local folder = Instance.new("Folder")
	folder.Name = name
	folder.Parent = root
	return folder
end

local recording = ChangeHistoryService:TryBeginRecording("MapBuildify: paths")
-- … build this pass …
if recording then
	ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
end
```

## Part helper driven by the style brief

Keep the palette and materials from the brief in one table so every pass uses the same values.

```lua
local STYLE = {
	grass = { color = Color3.fromHex("#5b8c3a"), material = Enum.Material.Grass },
	path  = { color = Color3.fromHex("#a0805a"), material = Enum.Material.Ground },
	stone = { color = Color3.fromHex("#7d7f86"), material = Enum.Material.Slate },
	wood  = { color = Color3.fromHex("#6b4a2f"), material = Enum.Material.WoodPlanks },
}

local function part(parent, name, size, cframe, style, shape)
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.Size = size
	p.CFrame = cframe
	p.Color = style.color
	p.Material = style.material
	if shape then p.Shape = shape end -- Enum.PartType.Cylinder / Ball / Wedge…
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end
```

For a stud-style look, set `TopSurface = Enum.SurfaceType.Studs` and use `Enum.Material.Plastic`
or `SmoothPlastic` as the examples show.

## Scattering props with a fixed seed

A fixed seed makes re-runs place things in the same spots.

```lua
local rng = Random.new(42)
local trees = zone("Trees")
for i = 1, 60 do
	local x, z = rng:NextNumber(-200, 200), rng:NextNumber(-200, 200)
	local height = rng:NextNumber(22, 34)
	part(trees, "Trunk", Vector3.new(2.5, height, 2.5), CFrame.new(x, height / 2, z), STYLE.wood)
	part(trees, "Leaves", Vector3.new(14, 14, 14), CFrame.new(x, height + 4, z), STYLE.grass, Enum.PartType.Ball)
end
```

Raycast down (`workspace:Raycast(origin, Vector3.new(0, -500, 0), params)`) to sit props on
uneven terrain instead of a fixed Y.

## Terrain

```lua
local terrain = workspace.Terrain
terrain:FillBlock(CFrame.new(0, -4, 0), Vector3.new(512, 8, 512), Enum.Material.Grass)
terrain:FillBall(Vector3.new(80, -10, 40), 40, Enum.Material.Rock)
terrain:FillBlock(CFrame.new(0, -6, 0), Vector3.new(24, 6, 400), Enum.Material.Water) -- river
terrain:SetMaterialColor(Enum.Material.Grass, Color3.fromHex("#5b8c3a"))
```

Terrain is not inside the root model, so note in your report which terrain you added.

## Lighting and atmosphere

```lua
local Lighting = game:GetService("Lighting")
Lighting.ClockTime = 17.5
Lighting.Ambient = Color3.fromHex("#2d3340")
Lighting.OutdoorAmbient = Color3.fromHex("#7a8494")
Lighting.Brightness = 2

local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmosphere.Density = 0.35
atmosphere.Haze = 1.5
atmosphere.Color = Color3.fromHex("#c7d0db")
atmosphere.Parent = Lighting
```

## Inserting assets from examples

Prefer the MCP's own insert-asset tool. Otherwise, in edit mode:

```lua
local model = game:GetObjects("rbxassetid://1234567890")[1]
model.Parent = root
model:PivotTo(CFrame.new(0, 0, 0))
```

## Spawn and camera for screenshots

```lua
local spawn = Instance.new("SpawnLocation")
spawn.Anchored = true
spawn.Size = Vector3.new(8, 1, 8)
spawn.CFrame = CFrame.new(0, 1, 0)
spawn.Parent = root

workspace.CurrentCamera.CFrame = CFrame.lookAt(Vector3.new(160, 120, 160), Vector3.new(0, 0, 0))
```
