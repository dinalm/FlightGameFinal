 document.addEventListener("DOMContentLoaded", async () => {

     const map = L.map("map").setView([56.266701, 15.265], 6);

     let moveCount = 0;
     let totalDistanceTraveled = 0;
     let totalFuelConsumed = 0;

     const player = {
         currentLat: 56.266701,
         currentLon: 15.265,
         fuel: 0,
         refuelAttempts: 5,
     };

     let playerName = "";

     const fetchPlayerStatus = async () => {
        const playerId = localStorage.getItem("player_id");
        if (!playerId) {
            console.error("Player ID not found. Please create a player first.");
            return false;
        }

        try {
            const response = await fetch(`/player_status/${playerId}`);
            const data = await response.json();

            if (response.ok) {
                player.fuel = data.fuel_units;
                player.refuelAttempts = data.refuel_attempts;
                playerName = data.screen_name;
                console.log(`Player Status Fetched: ${playerName}`);
                return true;
            } else {
                console.error(`Error fetching player status: ${data.message}`);
                return false;
            }
        } catch (error) {
            console.error("Error fetching player status:", error);
            return false;
        }
    };

    const statusFetched = await fetchPlayerStatus();
    if (!statusFetched) {
        return;
    }

    if (!playerName) {
        alert("Player name could not be retrieved. Please ensure your account is set up correctly.");
        return;
    }

    console.log(`Player name retrieved: ${playerName}`);

     const playerIcon = L.divIcon({
         className: "fixed-avatar-wrapper",
         html: '<div class="animated-avatar"></div>',
         iconSize: [70, 70],
         iconAnchor: [35, 10],
     });

     const playerMarker = L.marker([player.currentLat, player.currentLon],
         {icon: playerIcon}).addTo(map);

     L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
         attribution: '© OpenStreetMap contributors',
     }).addTo(map);

     const airports = [
    { id: 1, name: "Ronneby Airport", lat: 56.266701, lon: 15.265 },
    { id: 2, name: "Malmen Air Base", lat: 58.402032, lon: 15.525696 },
    { id: 3, name: "Uppsala Airport", lat: 59.897300, lon: 17.588601 },
    { id: 4, name: "Babice Airport", lat: 52.268501, lon: 20.910999 },
    { id: 5, name: "Bydgoszcz Ignacy Jan Paderewski Airport", lat: 53.096802, lon: 17.977699 },
    { id: 6, name: "Cewice Air Base", lat: 54.416000, lon: 17.763300 },
    { id: 7, name: "Maastricht Aachen Airport", lat: 50.911701, lon: 5.770140 },
    { id: 8, name: "Budel Airfield Kempen", lat: 51.255299, lon: 5.601390 },
    { id: 9, name: "Amsterdam Airport Schiphol", lat: 52.308601, lon: 4.763890 },
    { id: 10, name: "Croton Airport", lat: 39.997200, lon: 17.080200 },
    { id: 11, name: "Foggia Airport", lat: 41.541401, lon: 15.718100 },
    { id: 12, name: "L'Aquila-Preturo Airport", lat: 42.379902, lon: 13.309200 },
    { id: 13, name: "Enniskillen/St Angelo Airport", lat: 54.398899, lon: -7.651570 },
    { id: 14, name: "George Best Belfast City Airport", lat: 54.657501, lon: -6.215830 },
    { id: 15, name: "Belfast International Airport", lat: 54.657501, lon: -6.215830 },
    { id: 16, name: "Aérodrome du Plan-de-Dieu - Orange", lat: 44.180000, lon: 4.918890 },
    { id: 17, name: "Aérodrome privé de Soucelles", lat: 47.580399, lon: -0.412269 },
    { id: 18, name: "Chambley-Bussières Air Base", lat: 49.025501, lon: 5.876070 },
    { id: 19, name: "Fuerteventura Airport", lat: 28.452700, lon: -13.863800 },
    { id: 20, name: "Jayena Airfield", lat: 36.930698, lon: -3.835380 },
    { id: 21, name: "Aeródromo forestal de Mojados", lat: 41.465728, lon: -4.713068 },
    { id: 22, name: "Altenburg-Nobitz Airport", lat: 50.981945, lon: 12.506389 },
    { id: 23, name: "Flugplatz Bautzen", lat: 51.193611, lon: 14.519722 },
    { id: 24, name: "Dessau Airfield", lat: 51.831694, lon: 12.190962 },
    { id: 25, name: "Beauvechain Air Base", lat: 50.758598, lon: 4.768330 },
    { id: 26, name: "Kleine Brogel Air Base", lat: 51.163801, lon: 5.470000 },
    { id: 27, name: "Antwerp International Airport (Deurne)", lat: 51.189400, lon: 4.460280 },
    { id: 28, name: "Graz Airport", lat: 46.991100, lon: 15.439600 },
    { id: 29, name: "Wiener Neustadt East Airport", lat: 47.843299, lon: 16.260099 },
    { id: 30, name: "Wels Airport", lat: 48.183300, lon: 14.040900 },
    ];

     const calculateTravel = (currentLat, currentLon, destLat, destLon, airport) => {
        const distance = calculateDistance(currentLat, currentLon, destLat, destLon);
        const fuelRequired = distance * 0.5;

        document.getElementById("travel-distance").textContent = `${distance.toFixed(1)} km`;
        document.getElementById("fuel-required").textContent = `${fuelRequired.toFixed(1)} units`;

        document.getElementById("confirm-travel-btn").onclick = async () => {
            const playerId = localStorage.getItem("player_id");

            if (!playerId) {
                alert("Player ID not found. Please create a player first.");
                return;
            }

            if (player.fuel >= fuelRequired) {
                const confirmTravel = confirm(`Do you want to travel to ${airport.name}?`);
                if (!confirmTravel) return;

                try {
                    console.log(`Attempting to travel to: ${airport.name} (ID: ${airport.id})`);

                    const response = await fetch("/travel", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            player_id: playerId,
                            destination_airport_id: airport.id,
                            fuel_required: fuelRequired,
                        }),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        const startLatLng = L.latLng(player.currentLat, player.currentLon);
                        const endLatLng = L.latLng(destLat, destLon);
                        moveCount++;
                        totalDistanceTraveled += distance;
                        totalFuelConsumed += fuelRequired;
                        player.fuel -= fuelRequired;
                        player.currentLat = destLat;
                        player.currentLon = destLon;

                        smoothMove(playerMarker, startLatLng, endLatLng, 2000);

                        setTimeout(() => {
                            map.setView([destLat, destLon], 6);

                            if (checkGameConditions(airport.id)) {
                                return;
                            }
                        }, 2000);

                        console.log(`Travel successful to ${airport.name}`);
                    } else {
                        console.error(`Travel failed: ${result.message}`);
                        alert(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error("Travel error:", error);
                    alert("Failed to complete the travel.");
                }
            } else {
                alert(
                    `Not enough fuel for this trip. You need ${fuelRequired.toFixed(1)} units, but only have ${player.fuel.toFixed(1)} units.`
                );
            }
        };

     };

     const checkGameConditions = (airportId = null) => {
        if (airportId === 15) {
            console.log("Player has won!");
            recordLeaderboardEntry(playerName, moveCount, totalFuelConsumed, totalDistanceTraveled);
            displayEndGameMessage("Congratulations! You caught the fugitive.", "win");
            return true;
        }

        if (player.fuel <= 0 && player.refuelAttempts >= 5) {  // Losing Condition
            displayEndGameMessage("Game Over! You ran out of fuel.", "lose");
            return true;
        }

        return false;
     };

     const calculateDistance = (lat1, lon1, lat2, lon2) => {
         const toRad = (deg) => (deg * Math.PI) / 180;
         const R = 6371;
         const dLat = toRad(lat2 - lat1);
         const dLon = toRad(lon2 - lon1);
         const a =
             Math.sin(dLat / 2) ** 2 +
             Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
             Math.sin(dLon / 2) ** 2;
         return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
     };

     const smoothMove = (marker, startLatLng, endLatLng, duration) => {
         const frameRate = 60;
         const frameDuration = 1000 / frameRate;
         const totalFrames = duration / frameDuration;
         let currentFrame = 0;

         const latStep = (endLatLng.lat - startLatLng.lat) / totalFrames;
         const lngStep = (endLatLng.lng - startLatLng.lng) / totalFrames;

         const move = () => {
             if (currentFrame < totalFrames) {
                 currentFrame++;
                 const newLat = startLatLng.lat + latStep * currentFrame;
                 const newLng = startLatLng.lng + lngStep * currentFrame;

                 marker.setLatLng([newLat, newLng]);
                 requestAnimationFrame(move);
             }
         };

         move();
     };

     const fetchWeatherData = async (lat, lon) => {
         const apiKey = "3d10913cf535b0fcbe220e38a3dcdca3";
         const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

         try {
             console.log("Fetching weather data for:", lat, lon);
             console.log("Weather API URL:", apiUrl);

             const response = await fetch(apiUrl);
             const data = await response.json();

             if (response.ok) {
                 return `${data.main.temp}°C, ${data.weather[0].description}`;
             } else {
                 console.error("Weather API Error:", data.message);
                 return "Weather data unavailable";
             }
         } catch (error) {
             console.error("Failed to fetch weather data:", error);
             return "Failed to fetch weather data";
         }
     };

     airports.forEach((airport) => {
         const marker = L.marker([airport.lat, airport.lon]).addTo(map);

         marker.bindPopup(`<b>${airport.name}</b>`).on("click", async () => {

             document.getElementById(
                 "selected-airport").textContent = airport.name;

             const weather = await fetchWeatherData(airport.lat, airport.lon);
             document.getElementById("weather-info").textContent = weather;

             calculateTravel(player.currentLat, player.currentLon, airport.lat,
                 airport.lon, airport);
         });
     });

     const displayEndGameMessage = (message, type) => {
         const messageBox = document.createElement("div");
         messageBox.id = "end-game-message";
         messageBox.textContent = message;
         messageBox.classList.add(type === "win" ? "win-box" : "lose-box");

         document.body.appendChild(messageBox);

         if (type === "win") {
             for (let i = 0; i < 50; i++) {
                 const confetti = document.createElement("div");
                 confetti.classList.add("confetti-piece");
                 confetti.style.left = Math.random() * 100 + "%";
                 confetti.style.backgroundColor = `hsl(${Math.random() *
                 360}, 100%, 50%)`;
                 messageBox.appendChild(confetti);
             }
         }

         const confettiContainer = document.getElementById(
             'confetti-container');

         for (let i = 1; i <= 50; i++) {
             const confettiPiece = document.createElement('div');
             confettiPiece.className = 'confetti-piece';
             confettiPiece.style.left = `${Math.random() * 100}%`;
             confettiPiece.style.animationDelay = `${Math.random() * 3}s`;
             confettiContainer.appendChild(confettiPiece);
         }

     };

     let isStatusVisible = false;
     const playerStatusBtn = document.getElementById("player-status-btn");
     const playerStatusContainer = document.getElementById(
         "player-status-container");

     const updatePlayerStatus = async () => {
         const playerId = localStorage.getItem("player_id");

         if (!playerId) {
             alert("Player ID not found. Please create a player first.");
             return;
         }

         try {
             const response = await fetch(`/player_status/${playerId}`);
             const data = await response.json();

             if (response.ok) {
                 playerStatusContainer.innerHTML = `
                    <div class="status-data">
                        <strong>Player Name:</strong> <span>${data.screen_name}</span>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-data">
                        <strong>Current Location:</strong> <span>${data.airport_name}, ${data.country_name}</span>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-data">
                        <strong>Fuel Units:</strong> <span>${data.fuel_units}</span>
                    </div>
                    <div class="status-divider"></div>
                    <div class="status-data">
                        <strong>Refuel Attempts:</strong> <span>${data.refuel_attempts + "/5"||
                 "0/5"}</span>
                    </div>
                `;
             } else {
                 alert(
                     `Error: ${data.error ||
                     "Failed to fetch player status."}`);
             }
         } catch (error) {
             console.error("Failed to fetch player status:", error);
             alert("Failed to fetch player status. Please try again.");
         }
     };

     playerStatusBtn.addEventListener("click", async () => {
         if (isStatusVisible) {
             playerStatusContainer.innerHTML = "";
             playerStatusContainer.style.display = "none";
         } else {
             playerStatusContainer.style.display = "block";
             await updatePlayerStatus();
         }
         isStatusVisible = !isStatusVisible;
     });

     playerStatusContainer.style.display = "none";

     document.getElementById("refuel-btn").addEventListener("click", () => {
         const refuelContainer = document.getElementById("refuel-container");
         refuelContainer.style.display = refuelContainer.style.display ===
         "block" ? "none" : "block";
     });

     document.getElementById("refuel-confirm-btn").addEventListener("click", async () => {
        const fuelInput = document.getElementById("refuel-input");
        const fuelAmount = parseInt(fuelInput.value, 10);

        if (isNaN(fuelAmount) || fuelAmount <= 0) {
            alert("Please enter a valid fuel amount.");
            return;
        }

        if (fuelAmount > 1000) {
            alert("You cannot refuel more than 1000 units per session.");
            return;
        }

        const playerId = localStorage.getItem("player_id");
        if (!playerId) {
            alert("Player ID not found. Please create a player first.");
            return;
        }

        try {
            if (player.refuelAttempts >= 5) {
                alert("No refuel attempts left! Game Over.");
                checkGameConditions();
                return;
            }

            const response = await fetch("/refuel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ player_id: playerId, fuel_amount: fuelAmount }),
            });

            const result = await response.json();

            if (response.ok) {
                player.fuel += fuelAmount;
                player.refuelAttempts += 1;
                alert("Refueling successful!");
                document.getElementById("refuel-container").style.display = "none";
                fuelInput.value = "";

                checkGameConditions();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error("Refueling error:", error);
            alert("Failed to refuel. Please try again.");
        }
    });

     const cluesButton = document.getElementById("clues-btn");
     const npcInfoButton = document.getElementById("npc-info-btn");
     const cluesContainer = document.getElementById("clues-container");
     const npcContainer = document.getElementById("npc-container");

     const fetchClues = async () => {
         const playerId = localStorage.getItem("player_id");

         if (!playerId) {
             alert("Player ID not found. Please create a player first.");
             return;
         }

         try {
             const response = await fetch(`/airport_info/${playerId}`);
             const data = await response.json();

             if (response.ok) {
                 if (data.clues && data.clues.length > 0) {
                     const cluesHTML = data.clues.map(
                         (clue) => `<div class="info-data-clue">${clue.description}</div>`).
                         join("");
                     cluesContainer.innerHTML = cluesHTML;
                 } else {
                     cluesContainer.innerHTML = `<p>No clues available at this location.</p>`;
                 }
                 npcContainer.classList.add("info-box-hidden");
                 cluesContainer.classList.remove("info-box-hidden");
             } else {
                 alert(`Error: ${data.message || "Failed to fetch clues."}`);
             }
         } catch (error) {
             console.error("Error fetching clues:", error);
             alert("Failed to fetch clues. Please try again.");
         }
     };

     const fetchNpcInfo = async () => {
         const playerId = localStorage.getItem("player_id");

         if (!playerId) {
             alert("Player ID not found. Please create a player first.");
             return;
         }

         try {
             const response = await fetch(`/airport_info/${playerId}`);
             const data = await response.json();

             if (response.ok) {
                 if (data.npc_info && data.npc_info.length > 0) {
                     const npcHTML = data.npc_info.map(
                         (npc) =>
                             `<div class="npc-card">
                                    <div class="npc-image">
                                        <img src="${npc.image ||
                             '/static/images/npc.png'}" alt="NPC Image" />
                                    </div>
                                    <div class="info-data-npc">
                                        <p><strong>Name:</strong> ${npc.name}</p>
                                        <p><strong>Role:</strong> ${npc.role}</p>
                                        <p><strong>Information:</strong> ${npc.information}</p>
                                    </div>
                                </div>`
                     ).join("");
                     npcContainer.innerHTML = npcHTML;
                 } else {
                     npcContainer.innerHTML = `<p>No NPC information available at this location.</p>`;
                 }
                 cluesContainer.classList.add("info-box-hidden");
                 npcContainer.classList.remove("info-box-hidden");
             } else {
                 alert(`Error: ${data.message ||
                 "Failed to fetch NPC information."}`);
             }
         } catch (error) {
             console.error("Error fetching NPC information:", error);
             alert("Failed to fetch NPC information. Please try again.");
         }
     };

     cluesButton.addEventListener("click", () => {
         if (cluesContainer.classList.contains("show")) {
             cluesContainer.classList.remove("show");
         } else {
             cluesContainer.classList.add("show");
             npcContainer.classList.remove("show");
             fetchClues();
         }
     });

     npcInfoButton.addEventListener("click", () => {
         if (npcContainer.classList.contains("show")) {
             npcContainer.classList.remove("show");
         } else {
             npcContainer.classList.add("show");
             cluesContainer.classList.remove("show");
             fetchNpcInfo();
         }
     });

     const travelLogButton = document.getElementById("travel-log-btn");
     const travelLogContainer = document.getElementById("travel-log-container");
     const travelLogBody = document.getElementById("travel-log-body");

     const fetchTravelLog = async () => {
         const playerId = localStorage.getItem("player_id");

         if (!playerId) {
             alert("Player ID not found. Please create a player first.");
             return;
         }

         try {
             const response = await fetch(`/travel_log/${playerId}`);
             const data = await response.json();

             if (response.ok) {
                 if (data && data.length > 0) {
                     const logHTML = data.map((log) => {
                         const distance = parseFloat(log.distance_traveled);
                         return `
                            <tr>
                                <td>${log.departure_airport_name || "Unknown"}</td>
                                <td>${log.destination_airport_name || "Unknown"}</td>
                                <td>${!isNaN(distance) ?
                             `${distance.toFixed(1)} km` :
                             "N/A"}</td>
                                <td>${new Date(
                             log.movement_date).toLocaleString()}</td>
                            </tr>
                            `;
                     }).join("");

                     travelLogBody.innerHTML = logHTML;
                 } else {
                     travelLogBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No travel log available.</td></tr>`;
                 }

                 travelLogContainer.classList.remove("hidden");
                 setTimeout(() => {
                     travelLogContainer.style.opacity = 1;
                 }, 10);
             } else {
                 alert(
                     `Error: ${data.message || "Failed to fetch travel log."}`);
             }
         } catch (error) {
             console.error("Error fetching travel log:", error);
             alert("Failed to fetch travel log. Please try again.");
         }
     };

     const closeTravelLog = () => {
         travelLogContainer.style.opacity = 0;
         setTimeout(() => {
             travelLogContainer.classList.add("hidden");
         }, 300);
     };

     travelLogButton.addEventListener("click", fetchTravelLog);

     if (!document.getElementById("close-log-btn")) {
         const closeButton = document.createElement("button");
         closeButton.id = "close-log-btn";
         closeButton.textContent = "Close";
         closeButton.style.marginTop = "10px";
         closeButton.addEventListener("click", closeTravelLog);
         travelLogContainer.appendChild(closeButton);
     }

     const leaderboardBody = document.getElementById("leaderboard-body");

     const recordLeaderboardEntry = async (playerName, moves, fuel, distance) => {

        const playerId = localStorage.getItem("player_id");

        if (!playerId) {
            console.error("Player ID not found. Please create a player first.");
            return;
        }

        if (!playerName || moves === undefined || fuel === undefined || distance === undefined) {
            console.error("Invalid leaderboard entry data.");
            console.log("Debug Data:", { playerId, playerName, moves, fuel, distance });
            return;
        }

        try {
            console.log("Sending data to leaderboard:", {
                player_id: playerId,
                player_name: playerName,
                moves,
                fuel: parseFloat(fuel.toFixed(1)),
                distance: parseFloat(distance.toFixed(1)),
            });

            const response = await fetch("/leaderboard/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player_id: playerId,
                    player_name: playerName,
                    moves,
                    fuel: parseFloat(fuel.toFixed(1)),
                    distance: parseFloat(distance.toFixed(1)),
                }),
            });

            if (response.ok) {
                console.log("Player added to leaderboard successfully.");
                await fetchLeaderboard();
            } else {
                const result = await response.json();
                console.error("Failed to add player to leaderboard:", result.message || "Unknown error");
            }
        } catch (error) {
            console.error("Error recording leaderboard entry:", error);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center;">Loading...</td>
                </tr>`;

            const response = await fetch("/leaderboard");
            const data = await response.json();

            if (response.ok && data.status === "success") {
                if (data.leaderboard.length > 0) {
                    leaderboardBody.innerHTML = data.leaderboard
                        .map(
                            (entry, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${entry.player_name || "Unknown"}</td>
                                    <td>${entry.moves}</td>
                                    <td>${entry.fuel.toFixed(1)}</td>
                                    <td>${entry.distance.toFixed(1)}</td>             
                                </tr>`
                        )
                        .join("");
                } else {
                    leaderboardBody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center;">No leaderboard entries available.</td>
                        </tr>`;
                }
            } else {
                console.error("Failed to fetch leaderboard:", data.message || "Unknown error");
                leaderboardBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center;">Error loading leaderboard.</td>
                    </tr>`;
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center;">An error occurred while fetching the leaderboard.</td>
                </tr>`;
        }
    };

    await fetchLeaderboard();

});





