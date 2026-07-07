import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

interface AssignmentDetailDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string | null;
  detail?: string | null;
}

export const AssignmentDetailDialog = ({
  open,
  onClose,
  title,
  detail,
}: AssignmentDetailDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalle de asignacion</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1">{title ?? "Sin titulo"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {detail ?? "Sin detalles disponibles."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
