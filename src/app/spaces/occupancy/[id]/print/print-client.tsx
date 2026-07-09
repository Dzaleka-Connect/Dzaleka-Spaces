"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OccupancyRecord } from "@/lib/occupancies";
import { categoryLabel, formatMwk } from "@/lib/types";

type SupportedLang = "en" | "ny" | "sw" | "fr" | "rn";

const TRANSLATIONS: Record<SupportedLang, Record<string, string>> = {
  en: {
    title: "Occupancy Record",
    subtitle: "Dzaleka Spaces Arrangement Documentation",
    disclaimer: "This record documents the arrangement. It does not create or transfer ownership of land or property.",
    spaceDetails: "Space Details",
    agreedRent: "Agreed Rent",
    deposit: "Deposit",
    startDate: "Start Date",
    expectedEnd: "Expected End Date",
    paymentDueDay: "Payment Due Day",
    noticePeriod: "Notice Period",
    includedServices: "Included Services",
    parties: "Parties",
    notes: "Basic Conditions / Notes",
    signatureProvider: "Signature of Provider",
    signatureOccupant: "Signature of Occupant",
    date: "Date",
    printBtn: "Print Document",
    backBtn: "Back to Details",
    daily: "day",
    monthly: "month",
    none: "None",
    openEnded: "Open-ended",
    dayLabel: "Day",
    daysLabel: "days",
    notSet: "Not set",
    noneRecorded: "None recorded",
  },
  ny: {
    title: "Chikalata Chokhala m'Nyumba",
    subtitle: "Zolembedwa za Mgwirizano wa Dzaleka Spaces",
    disclaimer: "Chikalatachi chikuwonetsa mgwirizano wanu. Sikutanthauza kukhala eni a nthaka kapena nyumba.",
    spaceDetails: "Zambiri za Malo",
    agreedRent: "Ndalama ya Lendi",
    deposit: "Dipozeji",
    startDate: "Tsiku loyambira",
    expectedEnd: "Tsiku lomalizira",
    paymentDueDay: "Tsiku loperekera ndalama",
    noticePeriod: "Nthawi yochenjeza musanachoke",
    includedServices: "Zothandizira zomwe zilimo",
    parties: "Okhudzidwa",
    notes: "Zolemba / Zambiri Zina",
    signatureProvider: "Saini ya Mwenye Malo",
    signatureOccupant: "Saini ya Wobwereka",
    date: "Tsiku",
    printBtn: "Sindikizani Chikalatachi",
    backBtn: "Bwererani Mmbuyo",
    daily: "tsiku",
    monthly: "mwezi",
    none: "Palibe",
    openEnded: "Zosatha",
    dayLabel: "Tsiku la",
    daysLabel: "masiku",
    notSet: "Osakhazikitsidwa",
    noneRecorded: "Palibe zolembedwa",
  },
  sw: {
    title: "Hati ya Ukazi",
    subtitle: "Maandishi ya Makubaliano ya Dzaleka Spaces",
    disclaimer: "Hati hii inaorodhesha makubaliano. Haileti wala kuhamisha umiliki wa ardhi au mali.",
    spaceDetails: "Maelezo ya Eneo",
    agreedRent: "Kodi ya Kukubalika",
    deposit: "Dhamana (Deposit)",
    startDate: "Tarehe ya Kuanza",
    expectedEnd: "Tarehe ya Mwisho",
    paymentDueDay: "Siku ya Kulipa Kodi",
    noticePeriod: "Kipindi cha Taarifa",
    includedServices: "Huduma Zinazojumuishwa",
    parties: "Pande Husika",
    notes: "Masharti / Vidokezo",
    signatureProvider: "Saini ya Mtoa Eneo",
    signatureOccupant: "Saini ya Mkaaji",
    date: "Tarehe",
    printBtn: "Chapa Hati",
    backBtn: "Rudi kwenye Maelezo",
    daily: "siku",
    monthly: "mwezi",
    none: "Hakuna",
    openEnded: "Isiyo na mwisho",
    dayLabel: "Siku ya",
    daysLabel: "siku",
    notSet: "Haijawekwa",
    noneRecorded: "Hakuna iliyorekodiwa",
  },
  fr: {
    title: "Contrat d'Occupation",
    subtitle: "Documentation d'Arrangement Dzaleka Spaces",
    disclaimer: "Ce document atteste de l'arrangement. Il ne crée ni ne transfère la propriété d'un terrain ou d'un bien immobilier.",
    spaceDetails: "Détails de l'Espace",
    agreedRent: "Loyer Convenu",
    deposit: "Dépôt de Garantie",
    startDate: "Date de Début",
    expectedEnd: "Date de Fin Prévue",
    paymentDueDay: "Jour de Paiement Échu",
    noticePeriod: "Période de Préavis",
    includedServices: "Services Inclus",
    parties: "Parties Contractantes",
    notes: "Conditions de Base / Notes",
    signatureProvider: "Signature du Bailleur",
    signatureOccupant: "Signature de l'Occupant",
    date: "Date",
    printBtn: "Imprimer le Document",
    backBtn: "Retour aux Détails",
    daily: "jour",
    monthly: "mois",
    none: "Aucun",
    openEnded: "Indéterminée",
    dayLabel: "Jour",
    daysLabel: "jours",
    notSet: "Non défini",
    noneRecorded: "Aucun enregistré",
  },
  rn: {
    title: "Isezerano ryo Kuba mu Nzu",
    subtitle: "Ivyanditswe vy'Amasezerano ya Dzaleka Spaces",
    disclaimer: "Iki kete cerekana amasezerano yo kuba mu nzu. Ntivyerekana canke ngo bitange uburenganzira bw'ukwiyitirira ubutaka canke inzu.",
    spaceDetails: "Imidondoro y'Inzu",
    agreedRent: "Inoti z'ubukode buvuganywe",
    deposit: "Igaranti",
    startDate: "Itariki yo Gutangura",
    expectedEnd: "Itariki yo Kugerageza Kurangiza",
    paymentDueDay: "Umusi wo Kuriha",
    noticePeriod: "Igihe co Kumenyesha",
    includedServices: "Ibikoresho/Ibikorwa birimwo",
    parties: "Abasezeranye",
    notes: "Amasezerano / Ivyanditswe",
    signatureProvider: "Igikumu c'Uwatange inzu",
    signatureOccupant: "Igikumu c'Umukode",
    date: "Itariki",
    printBtn: "Sohora Iki Kete",
    backBtn: "Subira Inyuma",
    daily: "umusi",
    monthly: "ukwezi",
    none: "Nta yihari",
    openEnded: "Kidafise iherezo",
    dayLabel: "Umusi wa",
    daysLabel: "imisi",
    notSet: "Ntiwashizweho",
    noneRecorded: "Nta bikorwa vyanditswe",
  },
};

const LANGUAGES: { code: SupportedLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ny", label: "Chichewa" },
  { code: "sw", label: "Swahili" },
  { code: "fr", label: "Français" },
  { code: "rn", label: "Kirundi" },
];

export function PrintContractClient({ occupancy }: { occupancy: OccupancyRecord }) {
  const [lang, setLang] = useState<SupportedLang>("en");
  const t = TRANSLATIONS[lang];

  const handlePrint = () => {
    window.print();
  };

  const rentPeriod = occupancy.billingPeriod === "daily" ? t.daily : t.monthly;

  return (
    <div className="flex flex-col gap-6">
      {/* Settings bar - hidden on print */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href={`/provider/occupancies/${occupancy.id}`} />} nativeButton={false}>
            <ArrowLeft className="size-4" />
            {t.backBtn}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LANGUAGES.map((l) => (
            <Button
              key={l.code}
              variant={lang === l.code ? "default" : "outline"}
              size="sm"
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </Button>
          ))}
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            {t.printBtn}
          </Button>
        </div>
      </div>

      {/* Contract Sheet */}
      <Card className="rounded-none border-none shadow-none print:m-0 print:p-0">
        <CardContent className="flex flex-col gap-8 p-8 print:p-0">
          {/* Header */}
          <div className="flex flex-col items-center text-center border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.title}</h1>
            <p className="text-sm font-semibold tracking-wide text-primary mt-1 uppercase">{t.subtitle}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {occupancy.id}</p>
          </div>

          {/* Disclaimer Alert */}
          <div className="border border-amber-300/30 bg-amber-500/5 rounded-lg p-4 text-center">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t.disclaimer}</p>
          </div>

          {/* Core Terms grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-4 border rounded-xl p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                {t.spaceDetails}
              </h2>
              <dl className="grid gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Category / Zone</dt>
                  <dd className="font-semibold">{categoryLabel(occupancy.spaceCategory)} · {occupancy.spaceZone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Landmark</dt>
                  <dd className="font-medium">{occupancy.spaceLandmark}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-4 border rounded-xl p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Terms
              </h2>
              <dl className="grid gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t.agreedRent}</dt>
                  <dd className="font-bold text-primary">
                    {formatMwk(occupancy.agreedAmountMwk)} / {rentPeriod}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.deposit}</dt>
                  <dd className="font-semibold">
                    {occupancy.depositAmountMwk ? formatMwk(occupancy.depositAmountMwk) : t.none}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Dates and Rules */}
          <div className="border rounded-xl p-4">
            <dl className="grid gap-4 sm:grid-cols-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t.startDate}</dt>
                <dd className="font-semibold">{occupancy.startDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.expectedEnd}</dt>
                <dd className="font-semibold">{occupancy.expectedEndDate ?? t.openEnded}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.paymentDueDay}</dt>
                <dd className="font-semibold">
                  {occupancy.paymentDueDay ? `${t.dayLabel} ${occupancy.paymentDueDay}` : t.notSet}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.noticePeriod}</dt>
                <dd className="font-semibold">
                  {occupancy.noticePeriodDays ? `${occupancy.noticePeriodDays} ${t.daysLabel}` : t.notSet}
                </dd>
              </div>
            </dl>
          </div>

          {/* Included Services */}
          <div className="border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">{t.includedServices}</h3>
            <p className="text-sm text-foreground/90 bg-muted/30 p-2.5 rounded-lg border">
              {occupancy.includedServices ?? t.noneRecorded}
            </p>
          </div>

          {/* Notes */}
          {occupancy.notes && (
            <div className="border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">{t.notes}</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/30 p-2.5 rounded-lg border">
                {occupancy.notes}
              </p>
            </div>
          )}

          {/* Parties */}
          <div className="border rounded-xl p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2 mb-3">
              {t.parties}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {occupancy.parties.map((p) => (
                <div key={p.id} className="text-sm flex flex-col bg-muted/20 p-3 rounded-lg border">
                  <span className="text-xs uppercase font-bold text-muted-foreground">
                    {p.role === "provider" ? t.provider : t.occupant}
                  </span>
                  <span className="font-semibold mt-1">{p.fullName}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {p.contact ?? "-"}
                  </span>
                  <span className="text-xs font-semibold text-primary mt-2">
                    {p.confirmedAt ? `${t.confirmed} (${p.confirmationMethod})` : t.notConfirmed}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature lines */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t">
            <div className="flex flex-col gap-6 text-center">
              <div className="border-b border-dashed h-12 w-full"></div>
              <div className="text-sm">
                <p className="font-bold">{t.signatureProvider}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.date}: ______________________</p>
              </div>
            </div>
            <div className="flex flex-col gap-6 text-center">
              <div className="border-b border-dashed h-12 w-full"></div>
              <div className="text-sm">
                <p className="font-bold">{t.signatureOccupant}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.date}: ______________________</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
