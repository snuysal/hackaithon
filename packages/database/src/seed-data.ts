export type SeedUser = {
    name: string;
    email: string;
    teamName: string;
    password: string;
    birthDateIso: string;
    role: "ADMIN" | "TRAINER";
    approvalStatus: "APPROVED";
};

export type SeedBadge = {
    code: string;
    title: string;
    description: string;
    ruleJson: string;
};

export type SeedElearning = {
    id: string;
    createdByEmail?: string;
    title: string;
    description: string;
    level: "JUNIOR" | "MEDIOR" | "SENIOR";
    audience: "ALL" | "STAFF" | "PARTICIPANT";
    sections: ReadonlyArray<{
        id: string;
        title: string;
        content: string;
        assignment?: {
            assignmentType: "QUIZ" | "OPEN_TEXT";
            prompt: string;
            optionsJson?: string;
            correctAnswerJson?: string;
            points: number;
        };
    }>;
};

export const DEFAULT_SEED_USERS: ReadonlyArray<SeedUser> = [
    {
        name: "System Admin",
        email: "admin@hackaithon.local",
        teamName: "Core",
        password: "admin123",
        birthDateIso: "1990-01-01",
        role: "ADMIN",
        approvalStatus: "APPROVED",
    },
    {
        name: "Default Trainer",
        email: "trainer@hackaithon.local",
        teamName: "Core",
        password: "trainer123",
        birthDateIso: "1993-01-01",
        role: "TRAINER",
        approvalStatus: "APPROVED",
    },
];

export const DEFAULT_SEED_BADGES: ReadonlyArray<SeedBadge> = [
    {
        code: "STARTER",
        title: "Starter",
        description: "Rond je eerste onderdeel af.",
        ruleJson: JSON.stringify({ trigger: "section_completed", minCount: 1 }),
    },
    {
        code: "CONSISTENT",
        title: "Consistent",
        description: "Houd een 3-daagse leerstreak vol.",
        ruleJson: JSON.stringify({ trigger: "streak_days", minDays: 3 }),
    },
    {
        code: "FINISHER",
        title: "Finisher",
        description: "Voltooi je eerste e-learning.",
        ruleJson: JSON.stringify({ trigger: "course_completed", minCount: 1 }),
    },
];

export const DEFAULT_SEED_ELEARNINGS: ReadonlyArray<SeedElearning> = [
    {
        id: "seed-elearning-cerios-onboarding",
        title: "Welkom bij Cerios B.V.",
        description:
            "Een onboarding-e-learning over Cerios B.V. met basisinformatie over het bedrijf, de werkwijze, klantgericht werken en de rol van medewerkers. Bron: Cerios.nl.",
        level: "JUNIOR",
        audience: "ALL",
        sections: [
            {
                id: "seed-cerios-company-overview",
                title: "Wie is Cerios B.V.?",
                content:
                    "Cerios B.V. is een organisatie die zich richt op digitale dienstverlening, innovatie en samenwerking. De onderneming helpt klanten met praktische oplossingen en werkt daarbij aan een heldere en betrouwbare klantervaring. Een goede introductie begint met het begrijpen van de missie, de waarden en de manier waarop Cerios haar diensten aanpakt. Vanuit Cerios.nl kun je de basisinformatie terugvinden over de organisatie en haar focusgebieden.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Welke kernvraag hoort bij de introductie van Cerios B.V.?",
                    optionsJson: JSON.stringify([
                        "Wat is de prijs van de diensten?",
                        "Wat doet Cerios B.V. en hoe ondersteunt het klanten?",
                        "Welke vakantieplannen heeft de organisatie?",
                    ]),
                    correctAnswerJson: JSON.stringify("Wat doet Cerios B.V. en hoe ondersteunt het klanten?"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-vision",
                title: "Missie en waarden",
                content:
                    "Een sterke organisatie wordt gedragen door duidelijke waarden. Bij Cerios B.V. is het belangrijk om te werken met oog voor kwaliteit, samenwerking en klantgerichtheid. Als medewerker help je die waarden door verantwoordelijkheid te nemen, slim te communiceren en te kiezen voor oplossingen die passen bij de behoefte van de klant.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Welke houding past bij Cerios B.V.?",
                    optionsJson: JSON.stringify([
                        "Alleen werken wanneer iemand anders kijkt",
                        "Klantgericht en samenwerkingsgericht handelen",
                        "Alleen standaard antwoorden geven",
                    ]),
                    correctAnswerJson: JSON.stringify("Klantgericht en samenwerkingsgericht handelen"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-digital-services",
                title: "Digitale dienstverlening",
                content:
                    "Cerios werkt in een moderne omgeving waarin digitale oplossingen en samenwerking centraal staan. Dat betekent dat medewerkers snel kunnen schakelen tussen informatie, tools en klantcontact. Een goede basis is het begrijpen van de context, het volgen van afspraken en het gebruiken van betrouwbare informatie uit de juiste bronnen zoals Cerios.nl.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Waarom is digitale dienstverlening belangrijk voor Cerios B.V.?",
                    optionsJson: JSON.stringify([
                        "Omdat alles op papier moet gebeuren",
                        "Omdat samenwerking en snelle toegang tot informatie nodig zijn",
                        "Omdat klanten nooit vragen stellen",
                    ]),
                    correctAnswerJson: JSON.stringify("Omdat samenwerking en snelle toegang tot informatie nodig zijn"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-customer-focus",
                title: "Klanten centraal",
                content:
                    "Klanten verwachten dat hun behoeften serieus worden genomen. Daarom is het belangrijk om actief te luisteren, heldere informatie te geven en passende vervolgstappen te suggereren. Een medewerker van Cerios B.V. helpt klanten niet alleen met een antwoord, maar ook met een begrijpelijke en professionele ervaring.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wat is een belangrijke eigenschap van klantgericht werken?",
                    optionsJson: JSON.stringify([
                        "Snel antwoorden zonder uitleg",
                        "Actief luisteren en duidelijke communicatie",
                        "Alleen standaardformulieren gebruiken",
                    ]),
                    correctAnswerJson: JSON.stringify("Actief luisteren en duidelijke communicatie"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-working-together",
                title: "Samenwerken als team",
                content:
                    "Cerios B.V. werkt in een omgeving waarin samenwerking en afstemming belangrijk zijn. Goede communicatie, duidelijke handelingen en respect voor elkaars rol helpen om taken soepel te laten verlopen. Als medewerker draag je bij aan een professionele werkomgeving door open te communiceren en afspraken na te leven.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Waarom is samenwerking belangrijk binnen Cerios B.V.?",
                    optionsJson: JSON.stringify([
                        "Omdat iedereen alles zelf moet oplossen",
                        "Omdat afstemming en communicatie fouten voorkomen",
                        "Omdat taken nooit hoeven te worden gedeeld",
                    ]),
                    correctAnswerJson: JSON.stringify("Omdat afstemming en communicatie fouten voorkomen"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-responsibility",
                title: "Verantwoordelijkheid en kwaliteit",
                content:
                    "Kwaliteit begint bij kleine keuzes. Een medewerker van Cerios B.V. zorgt ervoor dat informatie klopt, dat taken zorgvuldig worden uitgevoerd en dat afspraken worden nagekomen. Dit draagt bij aan vertrouwen bij klanten en binnen het team.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wat hoort bij verantwoordelijkheid in deze context?",
                    optionsJson: JSON.stringify([
                        "Niets controleren en alles laten liggen",
                        "Zorgen voor kwaliteit en betrouwbaarheid",
                        "Alleen werken als er tijd over is",
                    ]),
                    correctAnswerJson: JSON.stringify("Zorgen voor kwaliteit en betrouwbaarheid"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-source-use",
                title: "Bronnen gebruiken",
                content:
                    "Een goede introductie maakt gebruik van betrouwbare bronnen. Voor Cerios B.V. is Cerios.nl een relevante bron om meer te leren over de organisatie, haar aanpak en haar informatie. Door informatie te vergelijken en te controleren, maak je betere keuzes in je werk.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wat kun je doen met informatie van Cerios.nl?",
                    optionsJson: JSON.stringify([
                        "Niets, omdat het niet nodig is",
                        "De informatie gebruiken om de organisatie beter te begrijpen",
                        "Alleen voor persoonlijk gebruik zonder context",
                    ]),
                    correctAnswerJson: JSON.stringify("De informatie gebruiken om de organisatie beter te begrijpen"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-problem-solving",
                title: "Problemen aanpakken",
                content:
                    "Een goede medewerker kijkt naar de kern van een probleem, vraagt door waar nodig is en zoekt naar een haalbare oplossing. Bij Cerios B.V. betekent dat dat je werkt met aandacht voor de klant, de organisatie en het proces dat daarbij hoort.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wat is een slimme aanpak bij problemen?",
                    optionsJson: JSON.stringify([
                        "Direct reageren zonder na te denken",
                        "De kern begrijpen en een passende oplossing zoeken",
                        "Alles uitstellen tot later",
                    ]),
                    correctAnswerJson: JSON.stringify("De kern begrijpen en een passende oplossing zoeken"),
                    points: 10,
                },
            },
            {
                id: "seed-cerios-open-reflection",
                title: "Reflectie op jouw rol",
                content:
                    "Neem even de tijd om na te denken over jouw rol binnen Cerios B.V. Welke waarde wil jij toevoegen? Hoe zie jij samenwerking, klantgericht werken en kwaliteit in jouw dagelijkse werkzaamheden terugkomen? Beschrijf in eigen woorden wat je van deze introductie meeneemt.",
                assignment: {
                    assignmentType: "OPEN_TEXT",
                    prompt: "Beschrijf in eigen woorden wat jij van deze introductie meeneemt voor jouw rol binnen Cerios B.V.",
                    points: 10,
                },
            },
            {
                id: "seed-cerios-open-next-step",
                title: "Volgende stap",
                content:
                    "Na deze introductie kun je nadenken over je volgende stap. Welke bijdrage wil je leveren aan Cerios B.V. en welke eerste actie zou je willen nemen om beter te begrijpen hoe het bedrijf werkt? Schrijf je ideeën kort op.",
                assignment: {
                    assignmentType: "OPEN_TEXT",
                    prompt: "Welke eerste actie wil jij ondernemen om jezelf beter in te werken bij Cerios B.V.?",
                    points: 10,
                },
            },
        ],
    },
    {
        id: "seed-elearning-platform-guide",
        title: "Werken met Cerios Academy",
        description:
            "Een praktische rondleiding voor trainers en beheerders. Leer e-learnings opbouwen, controleren, publiceren en open antwoorden beoordelen.",
        level: "JUNIOR",
        audience: "STAFF",
        sections: [
            {
                id: "seed-platform-guide-roles",
                title: "Rollen en navigatie",
                content:
                    "Cerios Academy kent drie rollen. Studenten volgen gepubliceerde e-learnings en bekijken hun voortgang. Trainers maken en beheren hun eigen leercontent en kijken open antwoorden na voor de e-learnings die zij hebben gemaakt. Beheerders kunnen daarnaast alle e-learnings beheren, alle open antwoorden nakijken, gebruikers goedkeuren en rollen wijzigen.\n\nVia Dashboard zie je leeractiviteit, beschikbare trainingen, badges en eventuele nakijkmeldingen. Catalogus toont het aanbod voor jouw rol. Historie bewaart afgeronde, actieve en ingestuurde trainingen. Als trainer of beheerder gebruik je E-learnings beheren om content te maken en Antwoorden nakijken om vrije invoervragen te beoordelen. Alleen beheerders zien ook Gebruikers.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Welke taak is uitsluitend beschikbaar voor een beheerder?",
                    optionsJson: JSON.stringify([
                        "Een eigen e-learning maken",
                        "Gebruikers goedkeuren en rollen wijzigen",
                        "Een gepubliceerde training volgen",
                    ]),
                    correctAnswerJson: JSON.stringify("Gebruikers goedkeuren en rollen wijzigen"),
                    points: 10,
                },
            },
            {
                id: "seed-platform-guide-create",
                title: "Een sterke e-learning maken",
                content:
                    "Open E-learnings beheren en kies Nieuwe e-learning. Geef de training een herkenbare titel, een korte beschrijving, het passende niveau en de juiste doelgroep. Bouw daarna het leerpad op uit overzichtelijke onderdelen. Elk onderdeel bevat uitleg en kan worden afgesloten met een meerkeuzevraag of open opdracht.\n\nHoud ieder onderdeel gericht op een leerdoel. Gebruik concrete voorbeelden, schrijf in begrijpelijke taal en controleer bij een quiz altijd de antwoordopties, het juiste antwoord en het aantal punten. Gebruik open vragen wanneer je wilt beoordelen of iemand de kennis kan toepassen in eigen woorden. De Academy berekent de geschatte duur automatisch op basis van niveau, tekst en vragen.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Waarop baseert de Academy de geschatte duur van een e-learning?",
                    optionsJson: JSON.stringify([
                        "Altijd op twintig minuten",
                        "Op niveau, hoeveelheid tekst en vragen",
                        "Alleen op het aantal onderdelen",
                    ]),
                    correctAnswerJson: JSON.stringify("Op niveau, hoeveelheid tekst en vragen"),
                    points: 10,
                },
            },
            {
                id: "seed-platform-guide-review",
                title: "Open antwoorden nakijken",
                content:
                    "Wanneer een student een e-learning afrondt met beantwoorde open vragen, krijgt de inschrijving de status Wacht op nakijken. De student kan de inzending bekijken, maar de open antwoorden zijn op dat moment alleen-lezen. Trainers en beheerders zien op het Dashboard hoeveel open antwoorden wachten.\n\nOpen Antwoorden nakijken om de wachtrij te bekijken. Per antwoord zie je de student, e-learning, het onderdeel, de vraag en het ingestuurde antwoord. Geef een cijfer van 1 tot en met 10 en voeg waar nodig feedback toe. Een open vraag is geslaagd vanaf 5,5. Nadat alle open vragen zijn beoordeeld, telt de uitslag mee in de totale 70%-norm. Bij onvoldoende resultaat ziet de student welke vragen opnieuw moeten.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Vanaf welk cijfer telt een open vraag als geslaagd mee?",
                    optionsJson: JSON.stringify([
                        "Vanaf 5,5",
                        "Alleen bij een 10",
                        "Open vragen tellen nooit mee",
                    ]),
                    correctAnswerJson: JSON.stringify("Vanaf 5,5"),
                    points: 10,
                },
            },
            {
                id: "seed-platform-guide-publish",
                title: "Controleren, publiceren en verbeteren",
                content:
                    "Een nieuwe e-learning wordt eerst als concept opgeslagen. Controleer titel, doelgroep, volgorde, inhoud en opdrachten voordat je publiceert. Na publicatie verschijnt de training direct in de catalogus van de gekozen doelgroep.\n\nGebruik je eigen catalogus om de leerervaring te doorlopen. Let op duidelijke instructies, logische overgangen en vragen die echt aansluiten op de uitleg. Test bij voorkeur zowel de directe quizfeedback als de open-vraagflow met Wacht op nakijken. Moet er iets beter, open dan de training opnieuw vanuit E-learnings beheren, pas de inhoud aan en sla de wijzigingen op. Bestaande inschrijvingen en historie blijven aan de e-learning gekoppeld.",
                assignment: {
                    assignmentType: "OPEN_TEXT",
                    prompt: "Welke drie punten controleer jij voordat je publiceert, en welke feedback zou je bij een open antwoord willen kunnen geven?",
                    points: 10,
                },
            },
            {
                id: "seed-platform-guide-users",
                title: "Gebruikers veilig beheren",
                content:
                    "Nieuwe studenten krijgen eerst de status In afwachting. Een beheerder controleert de aanvraag in Gebruikers en keurt deze goed of wijst deze af. Pas na goedkeuring kan een student trainingen starten.\n\nKen de rol Trainer alleen toe aan iemand die leercontent mag maken en onderhouden. De rol Beheerder geeft ook toegang tot gebruikersbeheer en alle e-learnings; gebruik deze rol daarom beperkt. Trainers hebben geen toegang tot gebruikersgoedkeuring. Bespreek wijzigingen in rollen binnen het beheerteam, zodat verantwoordelijkheden duidelijk blijven.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wanneer kan een nieuwe student een e-learning starten?",
                    optionsJson: JSON.stringify([
                        "Direct na registratie",
                        "Na goedkeuring door een beheerder",
                        "Nadat een trainer een badge toekent",
                    ]),
                    correctAnswerJson: JSON.stringify("Na goedkeuring door een beheerder"),
                    points: 10,
                },
            },
        ],
    },
    {
        id: "seed-elearning-participant-introduction",
        createdByEmail: "trainer@hackaithon.local",
        title: "Welkom bij Cerios Academy",
        description:
            "Jouw introductie tot de leeromgeving. Ontdek hoe je een training kiest, je voortgang bewaart, open vragen instuurt en met punten, badges en leerstreaks gemotiveerd blijft.",
        level: "JUNIOR",
        audience: "PARTICIPANT",
        sections: [
            {
                id: "seed-participant-intro-dashboard",
                title: "Jouw persoonlijke startpunt",
                content:
                    "Op het Dashboard zie je in een oogopslag welke e-learnings actief, ingestuurd of afgerond zijn, hoeveel kennispunten je hebt verdiend en hoeveel trainingen voor jou beschikbaar zijn. Onder Actieve e-learnings ga je direct verder waar je gebleven was of bekijk je de status van een inzending die wacht op nakijken.\n\nVia Catalogus ontdek je alle gepubliceerde trainingen die bij jouw rol passen. Je kunt zoeken op onderwerp en filteren op niveau. Open een kaart om de beschrijving, geschatte duur, leerdoelen en onderdelen te bekijken voordat je begint.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Waar vind je alle trainingen die voor jou beschikbaar zijn?",
                    optionsJson: JSON.stringify(["Gebruikers", "Catalogus", "E-learnings beheren"]),
                    correctAnswerJson: JSON.stringify("Catalogus"),
                    points: 10,
                },
            },
            {
                id: "seed-participant-intro-learning",
                title: "Leren en verdergaan",
                content:
                    "Kies Start e-learning om aan een training te beginnen. Je doorloopt de onderdelen in een vaste volgorde. Lees de uitleg rustig en beantwoord een vraag of opdracht wanneer die aanwezig is. Meerkeuzevragen worden direct gecontroleerd door de Academy. Open vragen worden na afronden nagekeken door een trainer of beheerder.\n\nJe voortgang wordt per onderdeel opgeslagen. Stop je tussendoor, dan gebruik je later Ga verder om terug te keren naar je laatste positie. Na het laatste onderdeel rond je de e-learning af. Als er open vragen wachten, krijgt je inzending de status Wacht op nakijken. Zodra alles beoordeeld is, zie je of je bent geslaagd of welke vragen je opnieuw mag doen.",
                assignment: {
                    assignmentType: "QUIZ",
                    prompt: "Wat gebeurt er wanneer je een e-learning tussendoor verlaat?",
                    optionsJson: JSON.stringify([
                        "Je moet altijd opnieuw beginnen",
                        "Je opgeslagen voortgang blijft beschikbaar",
                        "De training wordt automatisch afgerond",
                    ]),
                    correctAnswerJson: JSON.stringify("Je opgeslagen voortgang blijft beschikbaar"),
                    points: 10,
                },
            },
            {
                id: "seed-participant-intro-motivation",
                title: "Punten, badges en je leerstreak",
                content:
                    "Opdrachten kunnen kennispunten opleveren. Meerkeuzevragen leveren punten op zodra ze goed zijn beantwoord. Open vragen leveren punten op nadat ze voldoende zijn beoordeeld. Een open vraag is voldoende vanaf 5,5. Door onderdelen en volledige e-learnings af te ronden speel je badges vrij. Op je Dashboard zie je welke badges je al hebt en welk doel als volgende binnen bereik ligt.\n\nEen leerstreak laat zien hoeveel opeenvolgende dagen je een e-learning hebt afgerond. Regelmatig een kort leermoment plannen helpt om kennis beter vast te houden. De beloningen ondersteunen je voortgang, maar het belangrijkste doel blijft dat je de nieuwe kennis in je werk kunt toepassen.",
                assignment: {
                    assignmentType: "OPEN_TEXT",
                    prompt: "Beschrijf welk klein leermoment jij deze week inplant en hoe je laat zien dat je de nieuwe kennis hebt toegepast.",
                    points: 10,
                },
            },
        ],
    },
];
