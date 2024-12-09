class Player:
    def __init__(self, database):
        self.database = database

    def create_player(self, screen_name, default_airport_id=1, starting_fuel=250):
        try:
            query = """
            INSERT INTO player (screen_name, current_airport_id, fuel_units, refuel_attempts) 
            VALUES (%s, %s, %s, %s)
            """
            self.database.execute_query(query, (screen_name, default_airport_id, starting_fuel, 0))
            query = "SELECT LAST_INSERT_ID()"
            player_id = self.database.execute_query(query)[0][0]
            return {"success": True, "player_id": player_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_player_status(self, player_id):
        query = """
        SELECT screen_name, fuel_units, refuel_attempts, current_airport_id FROM player WHERE player_id = %s
        """
        result = self.database.execute_query(query, (player_id,))
        if result:
            airport_query = "SELECT name FROM airport WHERE id = %s"
            airport_name = self.database.execute_query(airport_query, (result[0][3],))[0][0]
            return {
                "screen_name": result[0][0],
                "fuel_units": result[0][1],
                "refuel_attempts": result[0][2],
                "current_airport": airport_name
            }
        return None

    def update_location(self, player_id, airport_id):
        query = """
        SELECT latitude_deg, longitude_deg FROM airport WHERE id = %s
        """
        airport_data = self.database.execute_query(query, (airport_id,))
        if not airport_data:
            return {"success": False, "error": "Airport not found."}

        new_latitude, new_longitude = airport_data[0]
        update_query = """
        UPDATE player SET current_airport_id = %s, current_latitude = %s, current_longitude = %s WHERE player_id = %s
        """
        self.database.execute_query(update_query, (airport_id, new_latitude, new_longitude, player_id))
        return {"success": True, "message": "Location updated successfully."}

    def create_player(self, screen_name, default_airport_id=1, starting_fuel=250):
        query = """
        INSERT INTO player (screen_name, current_airport_id, fuel_units, refuel_attempts) VALUES (%s, %s, %s, %s)
        """
        self.database.execute_query(query, (screen_name, default_airport_id, starting_fuel, 0))
        return {"success": True, "message": "Player created successfully."}

    def refuel_player(self, player_id, fuel_to_add):
        MAX_REFUEL_ATTEMPTS = 5
        refuel_query = """
        SELECT fuel_units, refuel_attempts FROM player WHERE player_id = %s
        """
        current_data = self.database.execute_query(refuel_query, (player_id,))
        if not current_data:
            return {"success": False, "error": "Player not found."}

        current_fuel, refuel_attempts = current_data[0]

        if refuel_attempts >= MAX_REFUEL_ATTEMPTS:
            return {"success": False, "error": "No refueling attempts left. Game over!"}

        if fuel_to_add > 1000:
            return {"success": False, "error": "Cannot refuel more than 1000 units at a time."}

        new_fuel = current_fuel + fuel_to_add
        new_attempts = refuel_attempts + 1

        self.database.execute_query(
            "UPDATE player SET fuel_units = %s, refuel_attempts = %s WHERE player_id = %s",
            (new_fuel, new_attempts, player_id)
        )

        if new_attempts >= MAX_REFUEL_ATTEMPTS:
            return {"success": False, "error": "No refueling attempts left. Game over!"}

        return {"success": True, "new_fuel": new_fuel, "remaining_attempts": MAX_REFUEL_ATTEMPTS - new_attempts}
