# Winsttool — aangepaste versie

Vervang index.html, app.js, style.css, service-worker.js, manifest.webmanifest en icon.svg in de hoofdmap van je bestaande Winsttool-repository. Publiceer via je bestaande GitHub Pages-instelling. Deze levering wijzigt de live website nog niet.

Open daarna de bestaande site online opnieuw. Sluit bij een oude weergave de iPhone-webapp volledig en open hem opnieuw. Wis geen websitegegevens: daarmee verdwijnen opgeslagen instellingen. De bestaande icoonverwijzingen zijn behouden.

## Gebruik
- Kies Dag, Week of Maand. De keuze geldt voor beide kanalen. Maand betekent 30 dagen, geen kalendermaand.
- Vul aantallen en omzet in voor diezelfde periode. De periodeknop rekent alleen dagelijkse kosten om; hij maakt geen omzetprognose en bewaart geen aparte historie per periode.
- Bol: gemiddelde verkoopprijs inclusief btw en gemiddelde inkoop exclusief btw **per artikel**, plus het aantal bestellingen. Artikelen per bestelling staat standaard op 1 en is instelbaar.
- Webshop: omzet inclusief btw, aantal bestellingen en inkoop exclusief btw voor de **hele periode**. Inkoop kan ook als percentage van netto omzet.
- Totaal: netto omzet, kosten, winst/verlies en gezamenlijke marge. Gedeelde huur of andere kosten slechts bij één kanaal invoeren.

## Rekenregels
De bestaande btw-aanname van 21% is behouden. Alle ingevoerde kosten zijn exclusief btw. De winst is vóór inkomsten- of vennootschapsbelasting.

Bol-artikelen = bestellingen × gemiddeld aantal artikelen per bestelling.
Bol-netto omzet = gemiddelde verkoopprijs × artikelen ÷ 1,21.
Commissie = vaste commissie × artikelen + omzet **inclusief btw** × commissiepercentage ÷ 100.
Inkoop en overige Bol-kosten worden per artikel vermenigvuldigd.
Fulfilment en verzending worden per bestelling vermenigvuldigd. Gebruik voor fulfilment het gemiddelde totaal per bestelling; tel inbegrepen verzending niet opnieuw mee.
Nieuwe vaste Bol-kosten zijn per dag × 1, 7 of 30 en tellen ook bij nul bestellingen mee.

Webshop: Ads, huur en overige kosten zijn per dag × periode. Fulfilment is per bestelling. Inkoopbedrag is een periodetotaal; een inkooppercentage wordt over netto omzet berekend.

Winst = netto omzet − alle kosten. Totale marge = gezamenlijke winst ÷ gezamenlijke netto omzet × 100; zonder omzet wordt geen marge weergegeven. Afronding gebeurt bij weergave.

De commissiegrondslag is gecorrigeerd volgens https://partnerplatform.bol.com/nl/idp/commissie (gecontroleerd 11 oktober 2026). Tarieven verschillen per artikel: de bewaarde/default tarieven zijn geen geverifieerde tarieven voor jouw assortiment. Gemiddelden leveren een raming bij een gemengd assortiment, retouren of uiteenlopende commissietarieven.

## Bestaande gegevens
De sleutels winsttool-settings en winsttool-state blijven behouden. Bestaande bedragen blijven staan. Een oude Bol-invoer krijgt bij migratie één bestelling, omdat de oude berekening voor één artikel was. Overige Bol-kosten blijven per artikel. Bestaande Webshop-periode blijft behouden en geldt nu voor beide kanalen.

Gegevens blijven beschikbaar bij vervanging op dezelfde site in dezelfde browser. Een lokaal voorbeeld of andere domeinnaam heeft eigen opslag. Instellingen worden pas na Opslaan toegepast. Bij geweigerde opslag blijft rekenen mogelijk met een melding.

## Controle
Rekentests geslaagd voor migratie, commissiegrondslag, artikel-/bestelkosten, nul bestellingen, dag/week/maand, verlies, inkooppercentage, gewogen totaalmarge, ongeldige invoer en geweigerde opslag. Voorbeeld: Bol €369 winst + Webshop €51 = €420 totaal op €1.200 netto omzet, marge 35%.

Browserweergave van het totaaloverzicht gecontroleerd, inclusief 390 px breedte zonder horizontale overflow. Niet op een fysieke iPhone getest. De offlinecache is bijgewerkt; offline-installatie en volledige browserautomatisering zijn niet end-to-end getest in deze omgeving.
