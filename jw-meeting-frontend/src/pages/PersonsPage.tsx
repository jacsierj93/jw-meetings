import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { useAppStore } from "../hooks/useAppStore";
import { useCreatePerson, usePersons, useUpdatePerson } from "../hooks/usePersons";
import type { Person } from "../types/person";
import {
  getAbsenceRange,
  getPersonAssignmentTypes,
  getPersonFirstName,
  getPersonPhone,
} from "../utils/assignmentRules";

export const PersonsPage = () => {
  const activeCongregationId = useAppStore((state) => state.activeCongregationId);
  const { data = [], isLoading } = usePersons(activeCongregationId, { includeInactive: true });
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [assignmentTypes, setAssignmentTypes] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editName, setEditName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [absenceStart, setAbsenceStart] = useState("");
  const [absenceEnd, setAbsenceEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const rows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return data
      .filter((person) => {
        if (statusFilter === "active" && !person.active) {
          return false;
        }
        if (statusFilter === "inactive" && person.active) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          person.full_name,
          getPersonFirstName(person),
          getPersonPhone(person),
          person.email ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        return a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" });
      })
      .map((person) => ({ ...person }));
  }, [data, searchText, statusFilter]);

  const buildPersonExtraData = (
    assignmentTypesValue: string[],
    absenceStartValue: string,
    absenceEndValue: string,
    firstNameValue: string,
    phoneValue: string,
    base?: Record<string, unknown>
  ) => {
    const result: Record<string, unknown> = { ...(base ?? {}) };

    if (assignmentTypesValue.length) {
      result.assignment_types = assignmentTypesValue;
    } else {
      delete result.assignment_types;
    }

    if (absenceStartValue && absenceEndValue) {
      result.absence = { start: absenceStartValue, end: absenceEndValue };
    } else {
      delete result.absence;
    }

    if (firstNameValue.trim()) {
      result.first_name = firstNameValue.trim();
    } else {
      delete result.first_name;
    }

    if (phoneValue.trim()) {
      result.phone = phoneValue.trim();
    } else {
      delete result.phone;
    }

    return Object.keys(result).length ? result : undefined;
  };

  const handleSave = async () => {
    if (!activeCongregationId) {
      setError("Selecciona una congregacion activa.");
      return;
    }
    setError(null);
    const extra_data = buildPersonExtraData(
      assignmentTypes,
      absenceStart,
      absenceEnd,
      firstName,
      phone
    );
    await createPerson.mutateAsync({
      congregation_id: activeCongregationId,
      full_name: fullName,
      email: email || undefined,
      extra_data,
    });
    setFullName("");
    setFirstName("");
    setPhone("");
    setEmail("");
    setAssignmentTypes([]);
    setAbsenceStart("");
    setAbsenceEnd("");
    setOpen(false);
  };

  const openEdit = (person: Person) => {
    setEditingPerson(person);
    setEditName(person.full_name);
    setEditFirstName(getPersonFirstName(person));
    setEditPhone(getPersonPhone(person));
    setEditEmail(person.email ?? "");
    setEditActive(Boolean(person.active));
    setAssignmentTypes(getPersonAssignmentTypes(person));
    const absence = getAbsenceRange(person);
    setAbsenceStart(absence?.start ?? "");
    setAbsenceEnd(absence?.end ?? "");
    setEditOpen(true);
  };

  const toggleAssignmentType = (type: string) => {
    setAssignmentTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  const getAssignmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lectura_biblica: "Lectura de la Biblia",
      empiece_conversaciones: "Empiece conversaciones",
      haga_revisitas: "Haga revisitas",
      haga_discipulos: "Haga discipulos",
      explique_creencias: "Explique sus creencias",
      discurso_ministerio: "Discurso (ministerio)",
      presidente: "Presidente",
      oraciones: "Oraciones (incluye lector estudio)",
      vida_ministerio: "Vida y tesoros (incluye conductor estudio)",
    };
    return labels[type] ?? type;
  };

  const columns: GridColDef<Person>[] = [
    { field: "full_name", headerName: "Nombre", flex: 1, minWidth: 200 },
    {
      field: "first_name",
      headerName: "Nombre de pila",
      minWidth: 160,
      valueGetter: (_value, row) => getPersonFirstName(row),
    },
    {
      field: "phone",
      headerName: "Telefono",
      minWidth: 160,
      valueGetter: (_value, row) => getPersonPhone(row),
    },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    {
      field: "active",
      headerName: "Estado",
      minWidth: 140,
      valueFormatter: ({ value }) => (value ? "Activo" : "Inactivo"),
    },
    {
      field: "assignment_types",
      headerName: "Tipos de asignacion",
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => {
        const types = getPersonAssignmentTypes(row);
        if (!types.length) {
          return "Estudiantil";
        }
        return (
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {types.map((type) => (
              <Chip key={type} label={getAssignmentTypeLabel(type)} size="small" />
            ))}
          </Stack>
        );
      },
    },
    {
      field: "absence",
      headerName: "Ausencia",
      minWidth: 180,
      renderCell: ({ row }) => {
        const absence = getAbsenceRange(row);
        if (!absence) {
          return "Sin ausencia";
        }
        return `${absence.start} - ${absence.end}`;
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton size="small" aria-label="Editar persona" onClick={() => openEdit(row)}>
          <EditRoundedIcon />
        </IconButton>
      ),
    },
  ];

  const handleUpdate = async () => {
    if (!editingPerson) {
      return;
    }
    const baseExtraData =
      editingPerson.extra_data && typeof editingPerson.extra_data === "object"
        ? editingPerson.extra_data
        : undefined;
    const extra_data = buildPersonExtraData(
      assignmentTypes,
      absenceStart,
      absenceEnd,
      editFirstName,
      editPhone,
      baseExtraData
    );
    await updatePerson.mutateAsync({
      personId: editingPerson.id,
      payload: {
        full_name: editName,
        email: editEmail || undefined,
        extra_data,
        active: editActive,
      },
    });
    setEditOpen(false);
  };

  return (
    <Stack gap={3}>
      {!activeCongregationId ? (
        <Alert severity="warning">
          Necesitas elegir una congregacion activa para gestionar personas.
        </Alert>
      ) : null}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="h4">Personas</Typography>
        <Button
          startIcon={<AddRoundedIcon />}
          variant="contained"
          onClick={() => setOpen(true)}
          disabled={!activeCongregationId}
        >
          Nueva persona
        </Button>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ xs: "stretch", md: "center" }}>
        <TextField
          label="Buscar persona"
          placeholder="Nombre, nombre de pila, telefono o email"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          fullWidth
        />
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="status-filter-persons">Estado</InputLabel>
          <Select
            labelId="status-filter-persons"
            label="Estado"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "inactive")
            }
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="active">Solo activos</MenuItem>
            <MenuItem value="inactive">Solo inactivos</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ height: 480, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          getRowClassName={(params) => (params.row.active ? "" : "person-row-inactive")}
          sx={{
            borderRadius: 4,
            background: "#fff",
            borderColor: "rgba(30, 95, 116, 0.12)",
            "& .person-row-inactive": {
              backgroundColor: "rgba(140, 140, 140, 0.12)",
            },
            "& .person-row-inactive .MuiDataGrid-cell": {
              color: "rgba(0, 0, 0, 0.45)",
            },
          }}
          onRowClick={(params) => openEdit(params.row)}
        />
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Agregar persona</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Nombre de pila (opcional)"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Telefono WhatsApp (opcional)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              fullWidth
            />
            <TextField
              label="Email (opcional)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />
            <Typography variant="subtitle2">Tipos de asignacion</Typography>
            <Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("lectura_biblica")}
                    onChange={() => toggleAssignmentType("lectura_biblica")}
                  />
                }
                label="Lectura de la Biblia"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("empiece_conversaciones")}
                    onChange={() => toggleAssignmentType("empiece_conversaciones")}
                  />
                }
                label="Empiece conversaciones"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("haga_revisitas")}
                    onChange={() => toggleAssignmentType("haga_revisitas")}
                  />
                }
                label="Haga revisitas"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("haga_discipulos")}
                    onChange={() => toggleAssignmentType("haga_discipulos")}
                  />
                }
                label="Haga discipulos"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("explique_creencias")}
                    onChange={() => toggleAssignmentType("explique_creencias")}
                  />
                }
                label="Explique sus creencias"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("discurso_ministerio")}
                    onChange={() => toggleAssignmentType("discurso_ministerio")}
                  />
                }
                label="Discurso (ministerio)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("presidente")}
                    onChange={() => toggleAssignmentType("presidente")}
                  />
                }
                label="Presidente"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("oraciones")}
                    onChange={() => toggleAssignmentType("oraciones")}
                  />
                }
                label="Oraciones (incluye lector del estudio)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("vida_ministerio")}
                    onChange={() => toggleAssignmentType("vida_ministerio")}
                  />
                }
                label="Vida y tesoros (incluye conductor del estudio)"
              />
            </Stack>
            <Typography variant="subtitle2">Ausencia</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                label="Desde"
                type="date"
                value={absenceStart}
                onChange={(event) => setAbsenceStart(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Hasta"
                type="date"
                value={absenceEnd}
                onChange={(event) => setAbsenceEnd(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!fullName || createPerson.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar persona</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Nombre de pila (opcional)"
              value={editFirstName}
              onChange={(event) => setEditFirstName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Telefono WhatsApp (opcional)"
              value={editPhone}
              onChange={(event) => setEditPhone(event.target.value)}
              fullWidth
            />
            <TextField
              label="Email (opcional)"
              value={editEmail}
              onChange={(event) => setEditEmail(event.target.value)}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch checked={editActive} onChange={() => setEditActive((prev) => !prev)} />
              }
              label="Activo"
            />
            <Typography variant="subtitle2">Tipos de asignacion</Typography>
            <Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("lectura_biblica")}
                    onChange={() => toggleAssignmentType("lectura_biblica")}
                  />
                }
                label="Lectura de la Biblia"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("empiece_conversaciones")}
                    onChange={() => toggleAssignmentType("empiece_conversaciones")}
                  />
                }
                label="Empiece conversaciones"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("haga_revisitas")}
                    onChange={() => toggleAssignmentType("haga_revisitas")}
                  />
                }
                label="Haga revisitas"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("haga_discipulos")}
                    onChange={() => toggleAssignmentType("haga_discipulos")}
                  />
                }
                label="Haga discipulos"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("explique_creencias")}
                    onChange={() => toggleAssignmentType("explique_creencias")}
                  />
                }
                label="Explique sus creencias"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("discurso_ministerio")}
                    onChange={() => toggleAssignmentType("discurso_ministerio")}
                  />
                }
                label="Discurso (ministerio)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("presidente")}
                    onChange={() => toggleAssignmentType("presidente")}
                  />
                }
                label="Presidente"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("oraciones")}
                    onChange={() => toggleAssignmentType("oraciones")}
                  />
                }
                label="Oraciones (incluye lector del estudio)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={assignmentTypes.includes("vida_ministerio")}
                    onChange={() => toggleAssignmentType("vida_ministerio")}
                  />
                }
                label="Vida y tesoros (incluye conductor del estudio)"
              />
            </Stack>
            <Typography variant="subtitle2">Ausencia</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                label="Desde"
                type="date"
                value={absenceStart}
                onChange={(event) => setAbsenceStart(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Hasta"
                type="date"
                value={absenceEnd}
                onChange={(event) => setAbsenceEnd(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updatePerson.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
