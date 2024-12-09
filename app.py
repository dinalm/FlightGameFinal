from flask import Flask, jsonify, request, render_template, redirect
from db_connection import Database
from game_logic import Game
from player_logic import Player
import requests

app = Flask(__name__)

db = Database(host="localhost", user="root", password="256481@dinal", database="flight_game")
db.connect()
cursor = db.cursor(dictionary=True)

game = Game(db)
player = Player(db)

WEATHER_API_KEY = "3d10913cf535b0fcbe220e38a3dcdca3"

@app.route('/')
def home():
    return render_template('index.html')
@app.route('/main')
def main():
    player_id = request.args.get('player_id')
    if not player_id:
        return redirect('/')

    query = "SELECT * FROM player WHERE player_id = %s"
    cursor.execute(query, (player_id,))
    player = cursor.fetchone()

    if not player:
        return redirect('/')

    return render_template('main.html', player=player)

@app.route('/create-player', methods=['POST'])
def create_player():
    try:
        data = request.get_json()
        player_name = data.get('player_name')

        if not player_name:
            return jsonify({"status": "error", "message": "Player name is required"}), 400

        query = """
            INSERT INTO player (screen_name, current_airport_id, fuel_units)
            VALUES (%s, 1, 250)
        """
        cursor = db.cursor()
        cursor.execute(query, (player_name,))
        db.commit()

        player_id = cursor.lastrowid
        return jsonify({"status": "success", "player_id": player_id}), 201

    except Exception as e:
        print("Error:", e)
        return jsonify({"status": "error", "message": "Failed to create a new player"}), 500

@app.route('/player/resume', methods=['POST'])
def resume_player():
    data = request.json
    screen_name = data.get('screen_name')

    if not screen_name:
        return jsonify({"error": "Screen name is required"}), 400

    try:
        query = "SELECT * FROM player WHERE screen_name = %s"
        cursor.execute(query, (screen_name,))
        player = cursor.fetchone()

        if not player:
            return jsonify({"error": "Player not found"}), 404

        return jsonify({"player": player}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/player_status/<int:player_id>', methods=['GET'])
def get_player_status(player_id):
    try:
        query = """
        SELECT 
            p.screen_name,
            p.fuel_units,
            p.refuel_attempts,
            a.name AS airport_name,
            c.name AS country_name
        FROM 
            player p
        JOIN 
            airport a ON p.current_airport_id = a.id
        JOIN 
            country c ON a.iso_country = c.iso_country
        WHERE 
            p.player_id = %s
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query, (player_id,))
        player_status = cursor.fetchone()
        if not player_status:
            return jsonify({"error": "Player not found", "debug": {"player_id": player_id}}), 404
        return jsonify(player_status), 200
    except Exception as e:
        return jsonify({"error": str(e), "debug": {"player_id": player_id}}), 500


@app.route('/game/start/<int:player_id>', methods=['POST'])
def start_game(player_id):
    success = game.start_new_game(player_id)
    return jsonify(message="Game started successfully.") if success else jsonify(error="Failed to start the game"), 500


@app.route('/travel', methods=['POST'])
def travel():
    try:
        data = request.json
        player_id = data.get('player_id')
        destination_airport_id = data.get('destination_airport_id')
        fuel_required = data.get('fuel_required')

        if not player_id or not destination_airport_id or fuel_required is None:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT current_airport_id, fuel_units
            FROM player
            WHERE player_id = %s
        """, (player_id,))
        player = cursor.fetchone()

        if not player:
            return jsonify({"status": "error", "message": "Player not found"}), 404

        current_airport_id = player["current_airport_id"]
        current_fuel_units = player["fuel_units"]

        if current_fuel_units < fuel_required:
            return jsonify({"status": "error", "message": "Not enough fuel"}), 400

        cursor.execute("""
            UPDATE player
            SET current_airport_id = %s, fuel_units = fuel_units - %s
            WHERE player_id = %s
        """, (destination_airport_id, fuel_required, player_id))

        cursor.execute("""
            INSERT INTO player_movement (player_id, departure_airport_id, destination_airport_id, distance_traveled, movement_date)
            VALUES (%s, %s, %s, %s, NOW())
        """, (player_id, current_airport_id, destination_airport_id, fuel_required))

        db.commit()

        return jsonify({"status": "success", "message": "Travel successful"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/travel_log/<int:player_id>', methods=['GET'])
def get_travel_log(player_id):
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                pm.departure_airport_id, 
                pm.destination_airport_id, 
                a1.name AS departure_airport_name,
                a2.name AS destination_airport_name,
                pm.distance_traveled, 
                pm.movement_date
            FROM player_movement pm
            JOIN airport a1 ON pm.departure_airport_id = a1.id
            JOIN airport a2 ON pm.destination_airport_id = a2.id
            WHERE pm.player_id = %s
            ORDER BY pm.movement_date DESC
        """, (player_id,))
        travel_log = cursor.fetchall()
        print(travel_log)
        return jsonify(travel_log), 200
    except Exception as e:
        print(f"Error fetching travel log: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/refuel', methods=['POST'])
def refuel():
    try:
        data = request.json
        player_id = data.get('player_id')
        fuel_amount = data.get('fuel_amount')

        if not player_id or not fuel_amount:
            return jsonify({"status": "error", "message": "Missing player ID or fuel amount"}), 400

        if fuel_amount > 1000:
            return jsonify({"status": "error", "message": "Cannot refuel more than 1000 units per session"}), 400

        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT fuel_units, refuel_attempts FROM player WHERE player_id = %s", (player_id,))
        player = cursor.fetchone()

        if not player:
            return jsonify({"status": "error", "message": "Player not found"}), 404

        if player["refuel_attempts"] >= 5:
            return jsonify({"status": "error", "message": "No refuel attempts left. Game Over!"}), 400

        new_fuel_units = player["fuel_units"] + fuel_amount
        new_refuel_attempts = player["refuel_attempts"] + 1

        update_query = """
        UPDATE player
        SET fuel_units = %s, refuel_attempts = %s
        WHERE player_id = %s
        """
        cursor.execute(update_query, (new_fuel_units, new_refuel_attempts, player_id))
        db.commit()

        return jsonify({"status": "success", "message": "Refueling successful"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/airport_info/<int:player_id>', methods=['GET'])
def get_airport_info(player_id):
    try:
        query = """
        SELECT current_airport_id
        FROM player
        WHERE player_id = %s
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query, (player_id,))
        player = cursor.fetchone()

        if not player:
            return jsonify({"status": "error", "message": "Player not found"}), 404

        airport_id = player["current_airport_id"]

        clues_query = """
        SELECT description
        FROM clues
        WHERE airport_id = %s
        """
        cursor.execute(clues_query, (airport_id,))
        clues = cursor.fetchall()

        npc_query = """
        SELECT name, role, information
        FROM npc
        WHERE airport_id = %s
        """
        cursor.execute(npc_query, (airport_id,))
        npc_info = cursor.fetchall()

        return jsonify({
            "status": "success",
            "clues": clues,
            "npc_info": npc_info
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/airports', methods=['GET'])
def list_airports():
    query = """
    SELECT id, name, latitude_deg, longitude_deg, iso_country FROM airport
    """
    airports = db.execute_query(query)
    return jsonify({"airports": [
        {"id": a[0], "name": a[1], "lat": a[2], "lon": a[3], "country": a[4]} for a in airports
    ]})

@app.route('/clues/<int:airport_id>', methods=['GET'])
def fetch_clues(airport_id):
    query = "SELECT description FROM clues WHERE airport_id = %s"
    clues = db.execute_query(query, (airport_id,))
    if clues:
        return jsonify({"clues": [clue[0] for clue in clues]})
    return jsonify({"error": "No clues available at this airport."}), 404

@app.route('/npcs/<int:airport_id>', methods=['GET'])
def fetch_npcs(airport_id):
    query = "SELECT name, role, information FROM npc WHERE airport_id = %s"
    npcs = db.execute_query(query, (airport_id,))
    if npcs:
        return jsonify({
            "npcs": [{"name": npc[0], "role": npc[1], "info": npc[2]} for npc in npcs]
        })
    return jsonify({"error": "No NPCs available at this airport."}), 404

@app.route('/weather/<string:airport_code>', methods=['GET'])
def fetch_weather(airport_code):
    try:
        response = requests.get(
            "http://api.openweathermap.org/data/2.5/weather",
            params={
                "q": airport_code,
                "appid": WEATHER_API_KEY,
                "units": "metric"
            }
        )
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch weather data"}), response.status_code
    except Exception as e:
        return jsonify({"error": f"Error fetching weather data: {str(e)}"}), 500


@app.route('/leaderboard/add', methods=['POST'])
def add_to_leaderboard():
    try:
        data = request.json
        player_id = data['player_id']
        player_name = data['player_name']
        moves = data['moves']
        fuel = data['fuel']
        distance = data['distance']

        query = """
            INSERT INTO leaderboard (player_id, player_name, moves, fuel, distance)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor = db.cursor()
        cursor.execute(query, (player_id, player_name, moves, fuel, distance))
        db.commit()

        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        query = """
            SELECT
                l.id,
                p.screen_name AS player_name,
                l.moves,
                l.fuel,
                l.distance,
                l.created_at
            FROM leaderboard l
            JOIN player p ON l.player_id = p.player_id
            ORDER BY l.moves ASC, l.fuel ASC, l.distance DESC
            LIMIT 10;
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        leaderboard = cursor.fetchall()
        return jsonify({"status": "success", "leaderboard": leaderboard}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)

