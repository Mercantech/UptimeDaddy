---

## Rapport

[Projekt rapport (PDF)](Produkt_Rapport_Uptime_Daddy.pdf)

---

## Repositories

- **App**  
  https://github.com/Mercantec-GHC/h5-projekt-vi-er-dem-de-andre-ikke-ma-lege-med

- **Accounts service**  
  https://github.com/Mercantec-GHC/h5-projekt-vi-er-dem-de-andre-ikke-ma-lege-med-account-service

- **API**  
  https://github.com/Mercantec-GHC/H5-Projekt-dem-vi-andre-ikke-m--lege-med-Backend

- **IoT**  
  https://github.com/Mercantec-GHC/H5_Http_requester_pi

---

## Opstarts guide

Projektet kan startes på to måder:

### Kør med Docker

Sørg for, at Docker er installeret.

```bash
docker build -t h5-projekt .
docker run -p 5173:5173 h5-projekt
```
### Kør uden Docker

``` bash
npm i
npm run dev
```
