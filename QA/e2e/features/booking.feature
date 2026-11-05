# language: es
Característica: Reserva de canchas desde la web
  Como usuario de TennisApp
  Quiero autenticarme y preparar una reserva
  Para poder avanzar al checkout

  Escenario: Un visitante puede crear una cuenta
    Dado que visito la página principal
    Cuando abro el formulario de registro
    Y completo un registro válido
    Entonces el registro se completa correctamente

  Escenario: Un usuario registrado puede abrir el checkout de una reserva
    Dado que visito la página principal
    Cuando selecciono el primer horario disponible
    Y intento comprar la reserva
    Y completo el registro solicitado
    Y vuelvo a seleccionar un horario y comprar
    Entonces se abre el checkout de la reserva

  Escenario: Un login inválido muestra un error
    Dado que visito la página principal
    Cuando abro el formulario de login
    Y envío credenciales inválidas
    Entonces se muestra un error de autenticación


# ---------------------------------------------------------------------------
# English version (commented out and not executed).
# 
# language: en
#
# Feature: Court booking from the website
#   As a TennisApp user
#   I want to authenticate and prepare a booking
#   So that I can proceed to checkout
#
#   Scenario: A visitor can create an account
#     Given I visit the home page
#     When I open the registration form
#     And I complete a valid registration
#     Then the registration is completed successfully
#
#   Scenario: A registered user can open booking checkout
#     Given I visit the home page
#     When I select the first available time slot
#     And I try to purchase the booking
#     And I complete the requested registration
#     And I select a time slot and purchase again
#     Then the booking checkout opens
#
#   Scenario: An invalid login displays an error
#     Given I visit the home page
#     When I open the login form
#     And I submit invalid credentials
#     Then an authentication error is displayed
