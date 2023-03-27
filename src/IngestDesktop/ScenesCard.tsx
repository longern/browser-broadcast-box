import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Stack,
} from "@mui/material";
import React from "react";

import Card from "./Card";

export type Scene = {
  name: string;
  sources: any[];
};

export default function ScenesCard({
  scenes,
  selectedScene,
  onScenesChange,
  onSelectScene,
}: {
  scenes: Scene[];
  selectedScene: Scene;
  onScenesChange: (scenes: Scene[]) => void;
  onSelectScene: (scene: Scene) => void;
}) {
  const scenesAutoIncrement = React.useRef(0);

  function handleAddScenes(_: any) {
    scenesAutoIncrement.current++;
    const newScene = {
      name: `Scene ${scenesAutoIncrement.current}`,
      sources: [],
    };
    onScenesChange([...scenes, newScene]);
    onSelectScene(newScene);
  }

  function handleDeleteScenes(scene: Scene) {
    if (scenes.length === 1) return;
    const index = scenes.indexOf(scene);
    const newScenes = scenes.filter((s) => s !== scene);
    onScenesChange(newScenes);
    const newIndex = Math.min(index, newScenes.length - 1);
    onSelectScene(newScenes[newIndex]);
  }

  return (
    <Card header="Scenes">
      <Stack direction="column" sx={{ height: "100%" }}>
        <List disablePadding sx={{ flexGrow: 1, overflowY: "auto" }}>
          {scenes.map((scene) => (
            <ListItem key={scene.name} disablePadding>
              <ListItemButton
                selected={selectedScene === scene}
                onClick={() => onSelectScene(scene)}
              >
                {scene.name}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Stack direction={"row"} sx={{ p: 0.5 }}>
          <IconButton
            aria-label="add scene"
            size="small"
            onClick={handleAddScenes}
          >
            <AddIcon />
          </IconButton>
          <IconButton
            aria-label="delete scene"
            size="small"
            disabled={scenes.length === 1}
            onClick={() => handleDeleteScenes(selectedScene)}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}
