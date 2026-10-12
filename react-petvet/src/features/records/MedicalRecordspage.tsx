import { Fragment, useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/Appshell"
import { Plus, Eye, X, Search } from "lucide-react"
import { PetAvatar } from "@/components/shared/PetAvatar"
import { Collapsible } from "@/components/ui/collapsible"
import { medicalRecordsService } from "@/services/medicalRecords/medicalRecords.service"
import type { MedicalRecordReadDto, MedicalRecordCreateDto } from "@/services/medicalRecords/medicalRecords.dtos"
import { petsService } from "@/services/pets/pets.service"
import type { PetReadDto } from "@/services/pets/pets.dtos"
import { useAuth } from "@/services/auth/auth.service"

const avatarColors = ["bg-orange-200", "bg-slate-300", "bg-amber-300", "bg-yellow-200", "bg-slate-500", "bg-emerald-200", "bg-sky-200"]

function colorForId(id: number) {
  return avatarColors[id % avatarColors.length]
}

function prescriptionList(prescriptions: string | null): string[] {
  if (!prescriptions || !prescriptions.trim()) return []
  return prescriptions.split(";").map((s) => s.trim()).filter(Boolean)
}

const emptyForm = {
  petID: "",
  visitDate: new Date().toISOString().slice(0, 10),
  diagnosis: "",
  treatment: "",
  notes: "",
}

export default function MedicalRecordsPage() {
  const { isAdmin } = useAuth()

  const [records, setRecords] = useState<MedicalRecordReadDto[]>([])
  const [pets, setPets] = useState<PetReadDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [prescriptions, setPrescriptions] = useState<string[]>([])
  const [rxDraft, setRxDraft] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError("")
      try {
        const [recordsData, petsData] = await Promise.all([
          medicalRecordsService.getAll(),
          petsService.getAll(),
        ])
        if (!cancelled) {
          setRecords(recordsData)
          setPets(petsData)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            typeof err === "object" && err && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load medical records."
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
    setPrescriptions([])
    setRxDraft("")
    setSaveError("")
  }

  const hasPhotoByPetId = useMemo(() => {
    const map = new Map<number, boolean>()
    pets.forEach((p) => map.set(p.petID, !!p.photoPath))
    return map
  }, [pets])

  // Case-insensitive, partial match on pet name. Runs only over the records the
  // API already returned for this account, so owners never see other owners' records.
  const searchTerm = search.trim().toLowerCase()
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records
    return records.filter((r) => (r.petName ?? "").toLowerCase().includes(searchTerm))
  }, [records, searchTerm])

  const addPrescription = () => {
    if (!rxDraft.trim()) return
    setPrescriptions((prev) => [...prev, rxDraft.trim()])
    setRxDraft("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.petID || !form.visitDate || !form.diagnosis.trim()) return

    setIsSaving(true)
    setSaveError("")
    try {
      const payload: MedicalRecordCreateDto = {
        petID: Number(form.petID),
        visitDate: form.visitDate,
        diagnosis: form.diagnosis.trim() || undefined,
        treatment: form.treatment.trim() || undefined,
        notes: form.notes.trim() || undefined,
        prescriptions: prescriptions.length ? prescriptions.join("; ") : undefined,
      }
      const created = await medicalRecordsService.create(payload)
      setRecords((prev) =>
        [...prev, created].sort((a, b) => b.visitDate.localeCompare(a.visitDate))
      )
      closeModal()
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save medical record."
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pet name..."
              aria-label="Search medical records by pet name"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-green-500 px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Record
            </button>
          )}
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading records...</p>}

        {loadError && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && (
          <div className="overflow-hidden rounded-2xl border bg-white">
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Pet</th>
                  <th className="px-6 py-3 font-medium">Diagnosis</th>
                  <th className="px-6 py-3 font-medium">Prescriptions</th>
                  <th className="w-10 px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((r) => {
                  const rx = prescriptionList(r.prescriptions)
                  return (
                    <Fragment key={r.recordID}>
                      <tr className="align-top">
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                          {r.visitDate.slice(0, 10)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <PetAvatar
                              petID={r.petID}
                              hasPhoto={hasPhotoByPetId.get(r.petID) ?? false}
                              colorClassName={colorForId(r.petID)}
                              className="h-7 w-7 shrink-0 rounded-full object-cover"
                            />
                            <span className="font-medium text-slate-900">{r.petName ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{r.diagnosis ?? "—"}</div>
                          <div className="text-xs text-teal-600">{r.treatment ?? ""}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {rx.length === 0 ? "0 rx" : `${rx.length} rx`}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedId(expandedId === r.recordID ? null : r.recordID)}
                            className="text-teal-600 hover:text-teal-800"
                            aria-label="View record details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedId === r.recordID && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="space-y-1 px-6 py-4 text-sm text-slate-600">
                            {r.notes && (
                              <div>
                                <span className="font-semibold text-slate-800">Notes: </span>
                                {r.notes}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-slate-800">Prescriptions: </span>
                              {rx.length ? rx.join(", ") : "None"}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile: accordion cards */}
            <div className="divide-y md:hidden">
              {filteredRecords.map((r) => {
                const rx = prescriptionList(r.prescriptions)
                return (
                  <Collapsible
                    key={r.recordID}
                    className="px-4 py-3"
                    summaryClassName="py-1"
                    contentClassName="space-y-1.5 pb-2 pt-3 text-sm text-slate-600"
                    summary={
                      <div className="flex min-w-0 items-center gap-3">
                        <PetAvatar
                          petID={r.petID}
                          hasPhoto={hasPhotoByPetId.get(r.petID) ?? false}
                          colorClassName={colorForId(r.petID)}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {r.petName ?? "—"}{" "}
                            <span className="font-mono text-xs font-normal text-slate-400">
                              {r.visitDate.slice(0, 10)}
                            </span>
                          </div>
                          <div className="truncate text-xs text-teal-600">
                            {r.diagnosis ?? "—"} · {rx.length === 0 ? "0 rx" : `${rx.length} rx`}
                          </div>
                        </div>
                      </div>
                    }
                  >
                    {r.treatment && (
                      <div>
                        <span className="font-semibold text-slate-800">Treatment: </span>
                        {r.treatment}
                      </div>
                    )}
                    {r.notes && (
                      <div>
                        <span className="font-semibold text-slate-800">Notes: </span>
                        {r.notes}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-slate-800">Prescriptions: </span>
                      {rx.length ? rx.join(", ") : "None"}
                    </div>
                  </Collapsible>
                )
              })}
            </div>

            {records.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No records yet.</p>
            )}
            {records.length > 0 && filteredRecords.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No matching records</p>
            )}
          </div>
        )}
      </div>

      {/* Add Medical Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl scrollbar-hide">
            <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-800 px-6 py-4">
              <h2 className="font-semibold text-white">Add Medical Record</h2>
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
                  Visit Date
                </label>
                <input
                  type="date"
                  required
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Diagnosis
                </label>
                <input
                  type="text"
                  required
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  placeholder="e.g. Upper respiratory infection"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Treatment
                </label>
                <textarea
                  value={form.treatment}
                  onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                  placeholder="e.g. Supportive care, antibiotics..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional observations..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prescriptions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rxDraft}
                    onChange={(e) => setRxDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addPrescription()
                      }
                    }}
                    placeholder="e.g. Amoxicillin 250mg – BID x 7 days"
                    className="h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                  <button
                    type="button"
                    onClick={addPrescription}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-teal-700 to-emerald-500 text-white hover:opacity-90"
                    aria-label="Add prescription"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {prescriptions.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {prescriptions.map((rx, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-1.5 text-xs text-teal-800"
                      >
                        {rx}
                        <button
                          type="button"
                          onClick={() => setPrescriptions((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-teal-500 hover:text-teal-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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