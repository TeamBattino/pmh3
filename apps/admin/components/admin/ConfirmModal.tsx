import { Button } from "@/components/ui/Button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";

type ConfirmModalProps = {
  title: string;
  message?: string;
  onConfirm?: () => void;
};

function ConfirmModal({ title, message, onConfirm }: ConfirmModalProps) {
  return (
    <DialogContent>
      {title && <DialogTitle>{title}</DialogTitle>}
      {message && <DialogDescription>{message}</DialogDescription>}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button onClick={onConfirm}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default ConfirmModal;
