import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Stack,
} from "@mui/material";

import Card from "./Card";

export default function SourcesCard({
  sources,
  selectedSource,
  onSelectSource,
  onSourcesChange,
  onAddSourceDialogOpen,
}: {
  sources: any[];
  selectedSource: any;
  onSelectSource: (source: any) => void;
  onSourcesChange: (sources: any[]) => void;
  onAddSourceDialogOpen: () => void;
}) {
  return (
    <Card header="Sources">
      <Stack direction="column" sx={{ height: "100%" }}>
        <List disablePadding sx={{ flexGrow: 1, overflowY: "auto" }}>
          {sources.map((source) => (
            <ListItem key={source.id} disablePadding>
              <ListItemButton
                selected={source === selectedSource}
                onClick={() => onSelectSource(source)}
              >
                {source.name}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ p: 0.5 }}>
          <IconButton
            aria-label="Add source"
            size="small"
            onClick={onAddSourceDialogOpen}
          >
            <AddIcon />
          </IconButton>
          <IconButton
            aria-label="Remove source"
            size="small"
            disabled={!selectedSource}
            onClick={() => {
              const newSources = sources.filter(
                (source) => source.id !== selectedSource.id
              );
              onSourcesChange(newSources);
              onSelectSource(null);
            }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton
            aria-label="Move source up"
            size="small"
            disabled={!selectedSource || selectedSource === sources[0]}
            onClick={() => {
              const index = sources.indexOf(selectedSource);
              const newSources = [...sources];
              newSources[index] = newSources[index - 1];
              newSources[index - 1] = selectedSource;
              onSourcesChange(newSources);
            }}
          >
            <ArrowUpwardIcon />
          </IconButton>
          <IconButton
            aria-label="Move source down"
            size="small"
            disabled={
              !selectedSource || selectedSource === sources[sources.length - 1]
            }
            onClick={() => {
              const index = sources.indexOf(selectedSource);
              const newSources = [...sources];
              newSources[index] = newSources[index + 1];
              newSources[index + 1] = selectedSource;
              onSourcesChange(newSources);
            }}
          >
            <ArrowDownwardIcon />
          </IconButton>
        </Box>
      </Stack>
    </Card>
  );
}
