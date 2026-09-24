import { useEffect, useState } from "react"
import { AppShell } from "@/components/layout/Appshell"
import { Search, Plus, X } from "lucide-react"
import { petsService } from "@/services/pets/pets.service"
import type { PetReadDto, PetCreateDto } from "@/services/pets/pets.dtos"
import { usersService } from "@/services/users/users.service"
import type { UserReadDto } from "@/services/users/users.dtos"
import { useAuth } from "@/services/auth/auth.service"
import { PetAvatar } from "@/components/shared/PetAvatar"

const avatarColors = ["bg-orange-200", "bg-slate-300", "bg-amber-300", "bg-yellow-200", "bg-slate-500", "bg-emerald-200", "bg-sky-200"]

function colorForId(id: number) {
  return avatarColors[id % avatarColors.length]
}

function formatAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "—"
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let years = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    years--
  }
  if (years < 1) {
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
    return `${Math.max(months, 0)} mo`
  }
  if (years > 40) return "—" 
  return years === 1 ? "1 yr" : `${years} yrs`
}

function getDobBounds() {
  const today = new Date()
  const max = today.toISOString().split("T")[0]
  const earliest = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate())
  const min = earliest.toISOString().split("T")[0]
  return { min, max }
}

function validateDateOfBirth(species: string, dateOfBirth: string): string | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const now = new Date()
  if (isNaN(dob.getTime())) return "Please enter a valid date of birth."
  if (dob > now) return "Date of birth can't be in the future."

  const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const maxAge = species === "Dog" || species === "Cat" ? 25 : 40 
  if (ageYears > maxAge) {
    return `That date implies a ${Math.round(ageYears)}-year-old ${species.toLowerCase()}, which isn't realistic. Please double-check it.`
  }
  return null
}

function formatGender(gender: string | null): string {
  if (gender === "M") return "Male"
  if (gender === "F") return "Female"
  if (gender === "N") return "Neutered"
  return "Unknown"
}

function ownerDisplayName(user: UserReadDto): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return full || user.username
}

const emptyForm = {
  name: "",
  species: "Dog",
  breed: "",
  dateOfBirth: "",
  gender: "M",
  color: "",
  microchipID: "",
  ownerUserID: "",
}

export default function PetProfilesPage() {
  const { isAdmin } = useAuth()
  const [pets, setPets] = useState<PetReadDto[]>([])
  const [users, setUsers] = useState<UserReadDto[]>([])
  const [query, setQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { min: minDob, max: maxDob } = getDobBounds()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError("")
      try {
        const petsData = await petsService.getAll()
        if (!cancelled) setPets(petsData)

        try {
          const usersData = await usersService.getAll()
          if (!cancelled) setUsers(usersData)
        } catch {
          if (!cancelled) setUsers([])
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            typeof err === "object" && err && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load pets."
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

  const filteredPets = pets.filter((pet) =>
    pet.name.toLowerCase().includes(query.toLowerCase())
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setForm(emptyForm)
    setPhoto(null)
    setSaveError("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (isAdmin && !form.ownerUserID) return

    const dobError = validateDateOfBirth(form.species, form.dateOfBirth)
    if (dobError) {
      setSaveError(dobError)
      return
    }

    setIsSaving(true)
    setSaveError("")
    try {
      const payload: PetCreateDto = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || undefined,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        color: form.color.trim() || undefined,
        microchipID: form.microchipID.trim() || undefined,
        ownerUserID: isAdmin ? Number(form.ownerUserID) : undefined,
      }
      const created = await petsService.create(payload, photo)
      setPets((prev) => [created, ...prev])
      closeModal()
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save pet."
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Search + Add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pets..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-green-500 px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Pet
          </button>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading pets...</p>}

        {loadError && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Pet cards grid */}
        {!isLoading && !loadError && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPets.map((pet) => (
              <div key={pet.petID} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <PetAvatar
                      petID={pet.petID}
                      hasPhoto={!!pet.photoPath}
                      colorClassName={colorForId(pet.petID)}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{pet.name}</div>
                      <div className="text-xs text-teal-600">{pet.breed || "Unknown breed"}</div>
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      pet.species === "Dog"
                        ? "bg-sky-100 text-sky-700"
                        : pet.species === "Cat"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {pet.species}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-100 py-2 text-center">
                    <div className="text-sm font-semibold text-slate-900">{formatAge(pet.dateOfBirth)}</div>
                    <div className="text-[11px] text-slate-500">Age</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 py-2 text-center">
                    <div className="text-sm font-semibold text-slate-900">{formatGender(pet.gender)}</div>
                    <div className="text-[11px] text-slate-500">Gender</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Owner: <span className="text-slate-700">{pet.ownerName || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !loadError && filteredPets.length === 0 && (
          <p className="text-sm text-slate-500">
            {pets.length === 0 ? "No pets registered yet." : `No pets match "${query}".`}
          </p>
        )}
      </div>

      {/* Add Pet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl scrollbar-hide">
            <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-slate-900 to-teal-800 px-6 py-4">
              <h2 className="font-semibold text-white">Add New Pet</h2>
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
                  Pet Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Buddy"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Species
                  </label>
                  <select
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Breed
                  </label>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    placeholder="e.g. Labrador"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    min={minDob}
                    max={maxDob}
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="N">Neutered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Color
                  </label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="e.g. Golden"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Microchip ID
                  </label>
                  <input
                    type="text"
                    value={form.microchipID}
                    onChange={(e) => setForm({ ...form, microchipID: e.target.value })}
                    placeholder="Optional"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Owner
                  </label>
                  <select
                    required
                    value={form.ownerUserID}
                    onChange={(e) => setForm({ ...form, ownerUserID: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="">— Select owner —</option>
                    {users.map((u) => (
                      <option key={u.userID} value={u.userID}>
                        {ownerDisplayName(u)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
                />
                {photo && <p className="text-xs text-slate-500">{photo.name}</p>}
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