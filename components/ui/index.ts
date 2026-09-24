// ============================================================================
// UI primitives — re-exported from kui-native (git dependency, tag-pinned).
// App code imports from "@/components/ui" only, never "kui-native/*".
// Deep imports on purpose: the kui-native/modules/ui barrel pulls in optional
// peers (react-native-maps, expo-video, …) this app does not install.
// Need another component? Add its lines here.
// ============================================================================

export { AlertBanner } from "kui-native/modules/ui/AlertBanner";
export type { AlertAction, AlertBannerProps } from "kui-native/modules/ui/AlertBanner";
export { Avatar, AvatarGroup } from "kui-native/modules/ui/Avatar";
export type { AvatarGroupProps, AvatarProps } from "kui-native/modules/ui/Avatar";
export { Badge } from "kui-native/modules/ui/Badge";
export type { BadgeProps } from "kui-native/modules/ui/Badge";
export { Button } from "kui-native/modules/ui/Button";
export type { ButtonProps } from "kui-native/modules/ui/Button";
export { Card } from "kui-native/modules/ui/Card";
export type { CardProps } from "kui-native/modules/ui/Card";
export { Checkbox } from "kui-native/modules/ui/Checkbox";
export type { CheckboxProps } from "kui-native/modules/ui/Checkbox";
export { DropdownMenu } from "kui-native/modules/ui/DropdownMenu";
export type { DropdownItem, DropdownMenuProps } from "kui-native/modules/ui/DropdownMenu";
export { EmptyState } from "kui-native/modules/ui/EmptyState";
export type { EmptyStateProps } from "kui-native/modules/ui/EmptyState";
export { Label } from "kui-native/modules/ui/Label";
export type { LabelProps } from "kui-native/modules/ui/Label";
export { Modal } from "kui-native/modules/ui/Modal";
export type { ModalProps } from "kui-native/modules/ui/Modal";
export { PageHeader } from "kui-native/modules/ui/PageHeader";
export type { PageHeaderAction, PageHeaderProps } from "kui-native/modules/ui/PageHeader";
export { Progress } from "kui-native/modules/ui/Progress";
export type { ProgressProps } from "kui-native/modules/ui/Progress";
export { ScrollArea } from "kui-native/modules/ui/ScrollArea";
export type { ScrollAreaProps } from "kui-native/modules/ui/ScrollArea";
export { Select } from "kui-native/modules/ui/Select";
export type { SelectOption, SelectProps } from "kui-native/modules/ui/Select";
export { Separator } from "kui-native/modules/ui/Separator";
export type { SeparatorProps } from "kui-native/modules/ui/Separator";
export { SkeletonAvatar, SkeletonCard, SkeletonLine, SkeletonTableRow, SkeletonText } from "kui-native/modules/ui/Skeleton";
export type { SkeletonCardProps } from "kui-native/modules/ui/Skeleton";
export { Spinner } from "kui-native/modules/ui/Spinner";
export type { SpinnerProps } from "kui-native/modules/ui/Spinner";
export { Text } from "kui-native/modules/ui/Text";
export type { TextProps } from "kui-native/modules/ui/Text";
export { Input } from "kui-native/modules/ui/Input";
export type { InputProps } from "kui-native/modules/ui/Input";
export { TextInput } from "kui-native/modules/ui/TextInput";
export type { TextInputProps } from "kui-native/modules/ui/TextInput";
