from geopy.distance import geodesic
from player_logic import Player

class Game:
    def __init__(self, database):
        self.database = database

    def start_new_game(self, player_id):
        query = """
        INSERT INTO game_state (player_id, criminal_caught, moves_count) VALUES (%s, %s, %s)
        """
        self.database.execute_query(query, (player_id, False, 0))
        return True

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        start = (lat1, lon1)
        end = (lat2, lon2)
        return geodesic(start, end).kilometers

    def travel_to_airport(self, player_id, current_airport_id, destination_airport_id):
        query = "SELECT latitude_deg, longitude_deg FROM airport WHERE id = %s"
        current_coords = self.database.execute_query(query, (current_airport_id,))
        destination_coords = self.database.execute_query(query, (destination_airport_id,))

        if current_coords and destination_coords:
            distance = self.calculate_distance(
                current_coords[0][0], current_coords[0][1],
                destination_coords[0][0], destination_coords[0][1]
            )

            fuel_rate = 0.5
            required_fuel = distance * fuel_rate

            fuel_query = "SELECT fuel_units FROM player WHERE player_id = %s"
            player_fuel = self.database.execute_query(fuel_query, (player_id,))[0][0]

            if player_fuel >= required_fuel:
                new_fuel = player_fuel - required_fuel
                self.database.execute_query(
                    "UPDATE player SET fuel_units = %s WHERE player_id = %s",
                    (new_fuel, player_id)
                )
                Player(self.database).update_location(player_id, destination_airport_id)
                return {"success": True, "distance": distance, "remaining_fuel": new_fuel}
            else:
                return {"success": False, "error": "Not enough fuel to travel."}
        else:
            return {"success": False, "error": "Invalid airport ID."}

    def end_game(self, player_id, game_id, success=False):
        query = """
        UPDATE game_state SET game_over = %s, criminal_caught = %s WHERE game_id = %s
        """
        self.database.execute_query(query, (True, success, game_id))
        return {"success": True, "message": "Game ended."}

    def check_game_over(self, player_id):
        query = """
        SELECT refuel_attempts, fuel_units FROM player WHERE player_id = %s
        """
        result = self.database.execute_query(query, (player_id,))
        if result:
            refuel_attempts, fuel_units = result[0]
            if refuel_attempts >= 5 or fuel_units <= 0:
                return True
        return False
