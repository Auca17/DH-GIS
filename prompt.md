Vamos a subir el proyecto a GitHub. Hacelo con cuidado, en este orden, y mostrame el resultado de cada comprobación antes de seguir.

1. Antes del primer commit, revisá que no haya secretos: confirmá que .env.local y cualquier .env* estén en .gitignore y NO estén trackeados (git ls-files), y buscá en el código cadenas como "mongodb+srv" o contraseñas escritas. Sin abrir ni mostrar el contenido de .env.local.
2. Creá un archivo .env.example con MONGODB_URI= vacío y un comentario de para qué sirve.
3. LICENSE: MIT, año 2026, titulares: Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli.
4. README breve en español: qué es la app (leaderboard de descensos de MTB con GPS, MongoDB y GIS), tecnologías (Next.js, Leaflet con OpenStreetMap/OpenTopoMap, MongoDB Atlas), cómo correrla (npm install, copiar .env.example a .env.local, npm run dev), el equipo, y una sección "Créditos": datos del sendero de Trailforks, mapas © OpenStreetMap contributors y © OpenTopoMap (CC-BY-SA).
5. Confirmá que data/pequia.gpx quede incluido en el repo.
6. Renombrá la rama actual a main, hacé un commit inicial con mensaje claro y mostrame git status y la lista de archivos antes de subir.
7. Si tenés GitHub CLI (gh) instalado y con sesión iniciada, creá el repo PRIVADO llamado "dh-leaderboard" y subí main. Si no, decime los comandos exactos que tengo que correr yo.

No toques nada más. No subas nada que no hayas mostrado antes en la lista de archivos.

https://github.com/Auca17/DH-GIS.git
