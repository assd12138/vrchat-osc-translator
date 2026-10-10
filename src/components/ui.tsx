import {
  Button,
  type ButtonProps,
  Card,
  Checkbox,
  Description,
  FieldError,
  Header,
  Label,
  ListBox,
  Select,
  Tooltip,
} from "@heroui/react";
import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  actions,
  children,
  hideHeading = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  hideHeading?: boolean;
}) {
  return (
    <Card className="section-card" aria-label={hideHeading ? title : undefined}>
      {(!hideHeading || actions) && (
        <Card.Header
          className={`section-heading${hideHeading ? " section-actions" : ""}`}
        >
          {!hideHeading && (
            <div>
              <Card.Title>{title}</Card.Title>
              {description && (
                <Card.Description>{description}</Card.Description>
              )}
            </div>
          )}
          {actions}
        </Card.Header>
      )}
      <Card.Content className="section-content">{children}</Card.Content>
    </Card>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  id: string;
  label: string;
  options: SelectOption[];
}

export function TooltipButton({
  title,
  ...props
}: ButtonProps & { title: string }) {
  return (
    <Tooltip delay={300}>
      <Button {...props} />
      <Tooltip.Content>{title}</Tooltip.Content>
    </Tooltip>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  groups = [],
  isDisabled,
  description,
  isInvalid,
  placeholder,
  layout = "stacked",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  groups?: SelectOptionGroup[];
  isDisabled?: boolean;
  description?: string;
  isInvalid?: boolean;
  placeholder?: string;
  layout?: "stacked" | "row";
}) {
  return (
    <Select
      className={`w-full min-w-0${layout === "row" ? " settings-field" : ""}`}
      variant={layout === "row" ? "secondary" : "primary"}
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(key == null ? "" : String(key))}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      placeholder={placeholder}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {description &&
        (isInvalid && layout === "row" ? (
          <FieldError>{description}</FieldError>
        ) : (
          <Description>{description}</Description>
        ))}
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              <Label>{option.label}</Label>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
          {groups.map((group) => (
            <ListBox.Section key={group.id} id={group.id}>
              <Header>{group.label}</Header>
              {group.options.map((option) => (
                <ListBox.Item
                  key={option.value}
                  id={option.value}
                  textValue={option.label}
                >
                  <Label>{option.label}</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox.Section>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function CheckField({
  children,
  isSelected,
  onChange,
}: {
  children: ReactNode;
  isSelected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <Checkbox isSelected={isSelected} onChange={onChange}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label>{children}</Label>
      </Checkbox.Content>
    </Checkbox>
  );
}
