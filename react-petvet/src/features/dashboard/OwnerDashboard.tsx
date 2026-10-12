import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/Appshell"
import { PawPrint, ClipboardList, CalendarDays, Syringe } from "lucide-react"
import { appointmentsService } from "@/services/appointments/appointments.service"
import type { AppointmentReadDto } from "@/services/appointments/appointments.dtos"
import { medicalRecordsService } from "@/services/medicalRecords/medicalRecords.service"
import type { MedicalRecordReadDto } from "@/services/medicalRecords/medicalRecords.dtos"
import { vaccinationsService } from "@/services/vaccinations/vaccinations.service"
import type { VaccinationReadDto } from "@/services/vaccinations/vaccinations.dtos"
import { petsService } from "@/services/pets/pets.service"
import type { PetReadDto } from "@/services/pets/pets.dtos"

interface OwnedPet {
  petID: number
  name: string
}

function buildMyPets(
  pets: PetReadDto[],
  appointments: AppointmentReadDto[],
  records: MedicalRecordReadDto[],
  vaccinations: VaccinationReadDto[]
): OwnedPet[] {
  // Registered pets are authoritative, so pets with no history still appear.
  const map = new Map<number, string>()
  pets.forEach((p) => map.set(p.petID, p.name))
  // Fallback: pets referenced by history but missing from the pets response.
  const addIfMissing = (petID: number, petName: string | null) => {
    if (!map.has(petID)) map.set(petID, petName ?? `Pet #${petID}`)
  }
  appointments.forEach((a) => addIfMissing(a.petID, a.petName))
  records.forEach((r) => addIfMissing(r.petID, r.petName))
  vaccinations.forEach((v) => addIfMissing(v.petID, v.petName))
  return Array.from(map.entries()).map(([petID, name]) => ({ petID, name }))
}

function isDueSoon(nextDueDate: string | null): boolean {
  if (!nextDueDate) return false
  const daysUntil = Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / 86_400_000)
  return daysUntil <= 60
}

export default function OwnerDashboard() {
  const [pets, setPets] = useState<PetReadDto[]>([])
  const [appointments, setAppointments] = useState<AppointmentReadDto[]>([])
  const [records, setRecords] = useState<MedicalRecordReadDto[]>([])
  const [vaccinations, setVaccinations] = useState<VaccinationReadDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError("")
      try {
        const [petsData, appointmentsData, recordsData, vaccinationsData] = await Promise.all([
          petsService.getAll(),
          appointmentsService.getAll(),
          medicalRecordsService.getAll(),
          vaccinationsService.getAll(),
        ])
        if (!cancelled) {
          setPets(petsData)
          setAppointments(appointmentsData)
          setRecords(recordsData)
          setVaccinations(vaccinationsData)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            typeof err === "object" && err && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load your dashboard."
          setLoadError(message)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const myPets = useMemo(
    () => buildMyPets(pets, appointments, records, vaccinations),
    [pets, appointments, records, vaccinations]
  )

  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => a.status === "Scheduled")
      .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)),
    [appointments]
  )

  const vaccinesDueSoon = useMemo(
    () => vaccinations.filter((v) => isDueSoon(v.nextDueDate)),
    [vaccinations]
  )

  const stats = [
    { label: "My Pets", value: myPets.length, icon: PawPrint, color: "from-sky-500 to-sky-600" },
    { label: "Medical Records", value: records.length, icon: ClipboardList, color: "from-emerald-500 to-emerald-600" },
    { label: "Upcoming Appts", value: upcomingAppointments.length, icon: CalendarDays, color: "from-amber-500 to-amber-600" },
    { label: "Vaccines Due", value: vaccinesDueSoon.length, icon: Syringe, color: "from-orange-500 to-red-500" },
  ]

  if (isLoading) {
    return <AppShell><div className="p-4 text-sm text-slate-500 sm:p-6 lg:p-8">Loading your dashboard...</div></AppShell>
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-800 p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Welcome back
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Hi there!</h2>
          <p className="mt-2 text-slate-300">
            You have <span className="font-semibold text-white">{upcomingAppointments.length} upcoming appointment{upcomingAppointments.length === 1 ? "" : "s"}</span>{" "}
            and <span className="font-semibold text-white">{vaccinesDueSoon.length} vaccine{vaccinesDueSoon.length === 1 ? "" : "s"} due soon</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-sm`}>
                <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b bg-emerald-50/50 px-5 py-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <CalendarDays className="h-4 w-4 text-emerald-600" />
                Upcoming Appointments
              </div>
              <span className="text-xs text-slate-500">{upcomingAppointments.length}</span>
            </div>
            <div className="divide-y">
              {upcomingAppointments.slice(0, 5).map((a) => (
                <div key={a.appointmentID} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.petName ?? "—"}</div>
                    <div className="text-xs text-slate-500">{a.reason ?? "General visit"}</div>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {new Date(a.appointmentDateTime).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {upcomingAppointments.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500">No upcoming appointments.</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b bg-amber-50/50 px-5 py-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Syringe className="h-4 w-4 text-amber-600" />
                Vaccination Reminders
              </div>
              <span className="text-xs font-medium text-amber-600">{vaccinesDueSoon.length} due</span>
            </div>
            <div className="divide-y">
              {vaccinesDueSoon.slice(0, 5).map((v) => (
                <div key={v.vaccinationID} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{v.petName ?? "—"}</div>
                    <div className="text-xs text-slate-500">{v.vaccineType}</div>
                  </div>
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                    {v.nextDueDate}
                  </span>
                </div>
              ))}
              {vaccinesDueSoon.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500">No vaccines due soon.</p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b bg-emerald-50/50 px-5 py-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <PawPrint className="h-4 w-4 text-emerald-600" />
              My Pets
            </div>
            <span className="text-xs text-slate-500">{myPets.length} total</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {myPets.map((pet) => (
              <div key={pet.petID} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-teal-200" />
                <span className="font-medium text-slate-900">{pet.name}</span>
              </div>
            ))}
            {myPets.length === 0 && (
              <p className="text-sm text-slate-500">No pets on file yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}