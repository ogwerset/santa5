# City Bloxxx

Przeglądarkowy remake klasyka z telefonów Nokia (S40). Czysty HTML/CSS/JS + canvas 176x208, zero zależności, zero builda.

## Sterowanie
- **Zrzut bloku:** tap w ekran, `5`, spacja, Enter, OK na d-padzie
- **Menu:** strzałki / `2` `8`, OK / lewy soft key
- **Pauza / wstecz:** `Esc`, prawy soft key, czerwona słuchawka
- **Dźwięk:** `M` / `#`

## Zasady
- Blok wisi na dźwigu i buja się jak wahadło. Puść go tak, żeby wylądował na wieży.
- Wieża buja się coraz mocniej z wysokością. Perfect drop (±3 px) uspokaja wieżę i daje bonus mieszkańców.
- 5 perfectów z rzędu = dodatkowe życie. 3 pudła = game over.
- Rekordy zapisują się w `localStorage`.

## Lokalnie
```bash
npx serve .
```

## Deploy
Statyczny projekt - Vercel serwuje root repo bez build stepu.

Fan remake, oryginalne assety rysowane proceduralnie w kodzie.
