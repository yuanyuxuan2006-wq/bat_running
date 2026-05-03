#ifndef UTILITIES_H
#define UTILITIES_H

#include <string>
using std::string;

/**
 * Read a string from the user
 */
string read_string(string prompt);

/**
 * Read an integer from the user
 */
int read_integer(string prompt);

/**
 * Read a double from the user
 */
double read_double(string prompt);

#endif