#include "splashkit.h"
#include "utilities.h"
#include <sstream>
#include <iomanip>

const int WINDOW_WIDTH = 1000;
const int WINDOW_HEIGHT = 750;

const int MIN_TARGET_RADIUS = 25;
const int MAX_TARGET_RADIUS = 45;

const int PROGRESS_X = 60;
const int PROGRESS_Y = 60;
const int PROGRESS_WIDTH = 800;
const int PROGRESS_HEIGHT = 45;

struct target_data
{
    int x;
    int y;
    int radius;
};

struct reaction_game_data
{
    int targetHit;
    int hits;
    int clicks;
    int misses;
    unsigned int startTime;
    unsigned int totalTimeUsed;
    target_data target;
};

std::string format_double(double value)
{
    std::stringstream stream;
    stream << std::fixed << std::setprecision(2) << value;
    return stream.str();
}

int current_target_radius(int hits)
{
    int radius = MAX_TARGET_RADIUS - hits;

    if (radius < MIN_TARGET_RADIUS)
    {
        radius = MIN_TARGET_RADIUS;
    }

    return radius;
}

target_data random_target(int hits)
{
    target_data result;

    result.radius = current_target_radius(hits);
    result.x = rnd(result.radius, WINDOW_WIDTH - result.radius);
    result.y = rnd(result.radius + 120, WINDOW_HEIGHT - result.radius);

    return result;
}

reaction_game_data new_reaction_game(int targetHit)
{
    reaction_game_data game;

    game.targetHit = targetHit;
    game.hits = 0;
    game.clicks = 0;
    game.misses = 0;
    game.startTime = timer_ticks("game_timer");
    game.totalTimeUsed = 0;
    game.target = random_target(game.hits);

    return game;
}

bool mouse_over_target(target_data target)
{
    double distance = point_point_distance(
        mouse_position(),
        point_at(target.x, target.y));

    return distance <= target.radius;
}

double hit_rate(reaction_game_data game)
{
    if (game.clicks == 0)
    {
        return 0;
    }

    return double(game.hits) / game.clicks * 100;
}

double average_time_per_target(reaction_game_data game, double seconds)
{
    if (game.hits == 0)
    {
        return 0;
    }

    return seconds / game.hits;
}

string performance_grade(double avgTime, double hitRate)
{
    if (avgTime <= 0.6 && hitRate > 90)
    {
        return "Excellent";
    }
    else if (avgTime <= 1 && hitRate > 75)
    {
        return "Good";
    }
    else if (avgTime <= 3)
    {
        return "Keep Practising";
    }
    else
    {
        return "Need More Practice";
    }
}
void draw_start_screen(int targetHit)
{
    clear_screen(COLOR_WHITE);

    draw_text("Reaction Click Game", COLOR_BLACK, 350, 220);
    draw_text("Target Score: " + to_string(targetHit), COLOR_BLACK, 350, 270);
    draw_text("Click the red targets as quickly as possible.", COLOR_BLACK, 350, 320);
    draw_text("The game will record time, hits, misses, and hit rate.", COLOR_BLACK, 350, 350);
    draw_text("Press SPACE to start.", COLOR_BLACK, 350, 420);

    refresh_screen(60);
}

void draw_game(reaction_game_data game)
{
    clear_screen(COLOR_WHITE);

    double progress = double(game.hits) / game.targetHit;

    unsigned int currentTime = timer_ticks("game_timer") - game.startTime;
    double seconds = currentTime / 1000.0;
    double avgTime = average_time_per_target(game, seconds);

    draw_text("Reaction Click Game", COLOR_BLACK, 60, 20);

    draw_rectangle(COLOR_GRAY, PROGRESS_X, PROGRESS_Y, PROGRESS_WIDTH, PROGRESS_HEIGHT);
    fill_rectangle(COLOR_GREEN, PROGRESS_X, PROGRESS_Y, PROGRESS_WIDTH * progress, PROGRESS_HEIGHT);

    draw_text("Time: " + format_double(seconds) + " seconds", COLOR_BLACK, 60, 120);
    draw_text("Average Time: " + format_double(avgTime) + " seconds", COLOR_BLACK, 60, 150);
    draw_text("Hits: " + to_string(game.hits) + " / " + to_string(game.targetHit), COLOR_BLACK, 60, 180);
    draw_text("Clicks: " + to_string(game.clicks), COLOR_BLACK, 60, 210);
    draw_text("Misses: " + to_string(game.misses), COLOR_BLACK, 60, 240);
    draw_text("Hit Rate: " + format_double(hit_rate(game)) + "%", COLOR_BLACK, 60, 270);

    fill_circle(COLOR_RED, game.target.x, game.target.y, game.target.radius);

    refresh_screen(60);
}

void draw_result_screen(reaction_game_data game)
{
    clear_screen(COLOR_WHITE);

    double seconds = game.totalTimeUsed / 1000.0;
    double avgTime = average_time_per_target(game, seconds);
    double hitRate = hit_rate(game);
    string grade = performance_grade(avgTime, hitRate);

    draw_text("Game Finished!", COLOR_BLACK, 350, 210);
    draw_text("Grade: " + grade, COLOR_BLACK, 350, 260);
    draw_text("Total Hits: " + to_string(game.hits), COLOR_BLACK, 350, 310);
    draw_text("Total Clicks: " + to_string(game.clicks), COLOR_BLACK, 350, 340);
    draw_text("Misses: " + to_string(game.misses), COLOR_BLACK, 350, 370);
    draw_text("Hit Rate: " + format_double(hit_rate(game)) + "%", COLOR_BLACK, 350, 400);
    draw_text("Time Used: " + format_double(seconds) + " seconds", COLOR_BLACK, 350, 430);
    draw_text("Average Time: " + format_double(avgTime) + " seconds", COLOR_BLACK, 350, 460);
    draw_text("Press ESC or close the window to exit.", COLOR_BLACK, 350, 520);

    refresh_screen(60);
}

int main()
{
    write_line("Welcome to Reaction Click Game");

    int targetHit = read_integer("What's your target score: ");

    while (targetHit <= 0)
    {
        targetHit = read_integer("Please enter a positive whole number: ");
    }

    write_line("Click " + to_string(targetHit) + " targets to end the game.");

    open_window("Reaction Click Game", WINDOW_WIDTH, WINDOW_HEIGHT);

    while (!quit_requested() && !key_typed(SPACE_KEY))
    {
        process_events();
        draw_start_screen(targetHit);
    }

    create_timer("game_timer");
    start_timer("game_timer");

    reaction_game_data game = new_reaction_game(targetHit);

    while (!quit_requested() && game.hits < game.targetHit)
    {
        process_events();

        if (mouse_clicked(LEFT_BUTTON))
        {
            game.clicks++;

            if (mouse_over_target(game.target))
            {
                game.hits++;
                game.target = random_target(game.hits);
            }
            else
            {
                game.misses++;
            }
        }

        draw_game(game);
    }

    game.totalTimeUsed = timer_ticks("game_timer") - game.startTime;

    while (!quit_requested() && !key_typed(ESCAPE_KEY))
    {
        process_events();
        draw_result_screen(game);
    }

    return 0;
}