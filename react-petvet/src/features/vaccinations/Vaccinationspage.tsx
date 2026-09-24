import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/Appshell"
import { Plus, X, Search } from "lucide-react"
import { PetAvatar } from "@/components/shared/PetAvatar"
import { Collapsible } from "@/components/ui/collapsible"
import { vaccinationsService } from "@/services/vaccinations/vaccinations.service"
import type { VaccinationReadDto, VaccinationCreateDto } from "@/services/vaccinations/vaccinations.dtos"
import { petsService } from "@/services/pets/pets.service"
import type { PetReadDto } from "@/services/pets/pets.dtos"
import { useAuth } from "@/services/auth/auth.service"

const avatarColors = ["bg-orange-200", "bg-slate-300", "bg-amber-300", "bg-yellow-200", "bg-slate-500", "bg-emerald-200", "bg-sky-200"]

function colorForId(id: number) {
  return avatarColors[id % avatarColors.length]
}

function getStatus(nextDue: string | null): { label: string; className: string } {
  if (!nextDue) {
    return { label: "—", className: "border-slate-200 bg-slate-50 text-slate-500" }
  }
  const due = new Date(nextDue)
  const today = new Date()
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) {
    return { label: "Overdue", className: "border-red-300 bg-red-50 text-red-700" }
  }
  if (daysUntilDue <= 60) {
    return { label: "Due Soon", className: "border-amber-300 bg-amber-50 text-amber-700" }
  }
  return { label: "Current", className: "border-emerald-300 bg-emerald-50 text-emerald-700" }
}

const emptyForm = {
  petID: "",
  vaccineType: "",
  vaccinationDate: new Date().toISOString().slice(0, 10),
  nextDueDate: "",
  batchNumber: "",
  notes: "",
}

export default function VaccinationsPage() {
  const { isAdmin } = useAuth()

  const [vaccinations, setVaccinations] = useState<VaccinationReadDto[]>([])
  const [pets, setPets] = useState<PetReadDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError("")
      try {
        const [vaccinationsData, petsData] = await Promise.all([
          vaccinationsService.getAll(),
          petsService.getAll(),
        ])
        if (!cancelled) {
          setVaccinations(vaccinationsData)
          setPets(petsData)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            typeof err === "object" && err && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load vaccinations."
          setLoadError(message)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const closeModal = () => {
    setIsModalOpen(false)
    setForm(emptyForm)
    setSaveError("")
  }

  const hasPhotoByPetId = useMemo(() => {
    const map = new Map<number, boolean>()
    pets.forEach((p) => map.set(p.petID, !!p.photoPath))
    return map
  }, [pets])

  const filteredVaccinations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vaccinations
    return vaccinations.filter((v) =>
      [v.petName, v.vaccineType, v.batchNumber, v.administeredByName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    )
  }, [vaccinations, query])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.petID || !form.vaccineType.trim() || !form.vaccinationDate) return

    setIsSaving(true)
    setSaveError("")
    try {
      const payload: VaccinationCreateDto = {
        petID: Number(form.petID),
        vaccineType: form.vaccineType.trim(),
        vaccinationDate: form.vaccinationDate,
        batchNumber: form.batchNumber.trim() || undefined,
        nextDueDate: form.nextDueDate || null,
        notes: form.notes.trim() || undefined,
      }
      const created = await vaccinationsService.create(payload)
      setVaccinations((prev) =>
        [...prev, created].sort((a, b) => (a.petName ?? "").localeCompare(b.petName ?? ""))
      )
      closeModal()
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save vaccination."
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by pet, vaccine, batch no..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-green-500 px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Record Vaccination
            </button>
          )}
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading vaccinations...</p>}

        {loadError && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && (
          <div className="overflow-hidden rounded-2xl border bg-white">
            {/* Desktop / tablet table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Pet</th>
                  <th className="px-6 py-3 font-medium">Vaccine</th>
                  <th className="px-6 py-3 font-medium">Date Given</th>
                  <th className="px-6 py-3 font-medium">Batch No.</th>
                  <th className="px-6 py-3 font-medium">Next Due</th>
                  <th className="px-6 py-3 font-medium">Administered By</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVaccinations.map((v) => {
                  const status = getStatus(v.nextDueDate)
                  return (
                    <tr key={v.vaccinationID}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <PetAvatar
                            petID={v.petID}
                            hasPhoto={hasPhotoByPetId.get(v.petID) ?? false}
                            colorClassName={colorForId(v.petID)}
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                          />
                          <span className="font-medium text-slate-900">{v.petName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900">{v.vaccineType}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                        {v.vaccinationDate}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-teal-600">
                        {v.batchNumber ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                        {v.nextDueDate ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-teal-700">{v.administeredByName ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile: accordion cards */}
            <div className="divide-y md:hidden">
              {filteredVaccinations.map((v) => {
                const status = getStatus(v.nextDueDate)
                return (
                  <Collapsible
                    key={v.vaccinationID}
                    className="px-4 py-3"
                    summaryClassName="py-1"
                    contentClassName="space-y-1.5 pb-2 pt-3 text-sm text-slate-600"
                    summary={
                      <div className="flex min-w-0 items-center gap-3">
                        <PetAvatar
                          petID={v.petID}
                          hasPhoto={hasPhotoByPetId.get(v.petID) ?? false}
                          colorClassName={colorForId(v.petID)}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{v.petName ?? "—"}</div>
                          <div className="truncate text-xs text-teal-600">{v.vaccineType}</div>
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    }
                  >
                    <div>
                      <span className="font-semibold text-slate-800">Date Given: </span>
                      <span className="font-mono text-xs">{v.vaccinationDate}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Batch No.: </span>
                      <span className="font-mono text-xs">{v.batchNumber ?? "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Next Due: </span>
                      <span className="font-mono text-xs">{v.nextDueDate ?? "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Administered By: </span>
                      {v.administeredByName ?? "—"}
                    </div>
                  </Collapsible>
                )
              })}
            </div>

            {vaccinations.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No vaccination records yet.</p>
            )}
            {vaccinations.length > 0 && filteredVaccinations.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No vaccinations match "{query}".</p>
            )}
          </div>
        )}
      </div>

      {/* Record Vaccination Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl scrollbar-hide">
            <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-800 px-6 py-4">
              <h2 className="font-semibold text-white">Record Vaccination</h2>
              <button onClick={closeModal} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-6">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pet
                </label>
                <select
                  required
                  value={form.petID}
                  onChange={(e) => setForm({ ...form, petID: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="">— Select pet —</option>
                  {pets.map((p) => (
                    <option key={p.petID} value={p.petID}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vaccine Name
                </label>
                <input
                  type="text"
                  required
                  value={form.vaccineType}
                  onChange={(e) => setForm({ ...form, vaccineType: e.target.value })}
                  placeholder="e.g. Rabies, DHPP, FVRCP"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date Given
                  </label>
                  <input
                    type="date"
                    required
                    value={form.vaccinationDate}
                    onChange={(e) => setForm({ ...form, vaccinationDate: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="e.g. RAB-2025-0441"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 flex-1 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-500 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}