import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Week } from "../../types/program";

interface MinistryDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  week?: Week | null;
}

export const MinistryDetailsDialog = ({ open, onClose, week }: MinistryDetailsDialogProps) => {
  const items = week?.content?.ministry_items ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalles de Seamos mejores maestros</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          {week ? (
            <Typography color="text.secondary">
              Semana {week.week_number} · {week.date_range}
            </Typography>
          ) : null}
          {items.length === 0 ? (
            <Typography color="text.secondary">
              No hay detalles cargados para esta semana.
            </Typography>
          ) : (
            items.map((item, index) => (
              <Stack key={`${week?.id ?? "week"}-${index}`} gap={0.5}>
                <Typography variant="subtitle2">
                  {item.titulo ?? `Intervencion ${index + 1}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.detail?.raw_text ?? "Sin detalles"}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
