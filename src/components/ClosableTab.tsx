import { Tab, CloseButton, HStack } from "@chakra-ui/react";

interface ClosableTabProps {
  label: string;
  onClose: () => void;
}

export const ClosableTab = ({ label, onClose }: ClosableTabProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <Tab>
      <HStack spacing={1}>
        <span>{label}</span>
        <CloseButton size="sm" onClick={handleClose} />
      </HStack>
    </Tab>
  );
};
