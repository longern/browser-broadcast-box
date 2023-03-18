import React from "react";

import { Box, Menu, MenuItem as MuiMenuItem, Toolbar } from "@mui/material";

export type MenuItem = {
  label: string;
  items: MenuItem[];
  onClick?: () => void;
};

export default function MenuBar({ menuItems }: { menuItems: MenuItem[] }) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);
  const [selectedMenuItems, setSelectedMenuItems] = React.useState<MenuItem[]>(
    []
  );

  return (
    <Toolbar
      variant="dense"
      disableGutters
      sx={{ placeItems: "stretch", minHeight: 32 }}
    >
      {menuItems.map((menuItem) => (
        <Box
          key={menuItem.label}
          sx={{
            minWidth: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            transition: "background-color 0.2s",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setSelectedMenuItems(menuItem.items);
          }}
        >
          {menuItem.label}
        </Box>
      ))}
      <Menu
        MenuListProps={{
          disablePadding: true,
        }}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        {selectedMenuItems.map((item) => (
          <MuiMenuItem key={item.label} dense onClick={item.onClick}>
            {item.label}
          </MuiMenuItem>
        ))}
      </Menu>
    </Toolbar>
  );
}
