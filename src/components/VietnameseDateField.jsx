"use client";
import AppReactDatepicker from "@/libs/styles/AppReactDatepicker";
import TextField from "@mui/material/TextField";
export default function VietnameseDateField({
  component: Input = TextField,
  type,
  value,
  onChange,
  inputProps = {},
  ...props
}) {
  const parse = (value) => {
    if (!value) return null;
    const [year, month, day = 1] = String(value).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  return (
    <AppReactDatepicker
      selected={parse(value)}
      onChange={(date) => {
        const formatted = date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}${type === "month" ? "" : `-${String(date.getDate()).padStart(2, "0")}`}`
          : "";
        onChange?.({ target: { name: props.name, value: formatted } });
      }}
      showMonthYearPicker={type === "month"}
      showYearDropdown={type !== "month"}
      showMonthDropdown={type !== "month"}
      dropdownMode="select"
      dateFormat={type === "month" ? "MM/yyyy" : "dd/MM/yyyy"}
      minDate={parse(inputProps.min)}
      maxDate={parse(inputProps.max)}
      disabled={props.disabled}
      required={props.required}
      customInput={
        <Input
          {...props}
          type="text"
          inputProps={{ ...inputProps, min: undefined, max: undefined }}
        />
      }
      boxProps={{
        sx: {
          width: props.fullWidth ? "100%" : undefined,
          "& .react-datepicker-wrapper": { width: "100%" },
          "& .react-datepicker-popper": { zIndex: 1500 },
        },
      }}
    />
  );
}
