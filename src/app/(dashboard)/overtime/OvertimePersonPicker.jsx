"use client";

import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  TextField,
  Typography,
} from "@mui/material";

// Search without accents so staff names and personnel codes are both easy to find.
const searchable = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export function OvertimePerson({ person }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      <Avatar
        src={person.avatarUrl || undefined}
        alt={person.name}
        sx={{ width: 32, height: 32 }}
      >
        {person.name?.charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {person.name}
        </Typography>
        {person.code && (
          <Typography variant="caption" color="text.secondary">
            {person.code}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function OvertimePersonPicker({
  users = [],
  value,
  onChange,
  multiple = false,
  label = "Nhân viên",
  disabled,
  required,
  error,
  helperText,
  placeholder = "Tìm theo tên / mã nhân sự",
}) {
  const selected = multiple
    ? users.filter((user) => (value || []).includes(user.id))
    : users.find((user) => user.id === value) || null;
  return (
    <Autocomplete
      fullWidth
      size="small"
      multiple={multiple}
      disableCloseOnSelect={multiple}
      disabled={disabled}
      options={users}
      value={selected}
      getOptionLabel={(person) => person.name || person.code || person.id}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(options, { inputValue }) => {
        const search = searchable(inputValue.trim());
        return options.filter((person) =>
          searchable(`${person.name} ${person.code || ""}`).includes(search),
        );
      }}
      onChange={(_, selection) =>
        onChange(
          multiple ? selection.map((person) => person.id) : selection?.id || "",
        )
      }
      noOptionsText="Không tìm thấy nhân sự"
      ListboxProps={{
        sx: {
          maxHeight: 280,
          p: 0,
          "& .MuiAutocomplete-option": {
            minHeight: "56px !important",
            py: "6px !important",
            boxSizing: "border-box",
          },
        },
      }}
      renderOption={(props, person) => (
        <li {...props} key={person.id}>
          <OvertimePerson person={person} />
        </li>
      )}
      renderTags={(people, getTagProps) =>
        people.map((person, index) => {
          const { key, ...props } = getTagProps({ index });
          return (
            <Chip
              key={key}
              {...props}
              size="small"
              label={person.name}
              avatar={
                <Avatar src={person.avatarUrl || undefined}>
                  {person.name?.charAt(0)}
                </Avatar>
              }
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {!multiple && selected && (
                  <Avatar
                    src={selected.avatarUrl || undefined}
                    sx={{ width: 24, height: 24, ml: 1 }}
                  >
                    {selected.name?.charAt(0)}
                  </Avatar>
                )}
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
