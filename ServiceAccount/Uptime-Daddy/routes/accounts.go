package routes

import "net/http"

const (
	AccountsRegisterPath       = "/accounts/register"
	AccountsLoginPath          = "/accounts/login"
	AccountsRefreshPath        = "/accounts/refresh"
	AccountsMercantecOAuthPath = "/accounts/oauth/mercantec"
)

type AccountHandlers struct {
	Register       http.HandlerFunc
	Login          http.HandlerFunc
	Refresh        http.HandlerFunc
	MercantecOAuth http.HandlerFunc
}

func RegisterAccountRoutes(mux *http.ServeMux, handlers AccountHandlers) {
	if handlers.Register != nil {
		mux.HandleFunc(AccountsRegisterPath, postOnly(handlers.Register))
	}

	if handlers.Login != nil {
		mux.HandleFunc(AccountsLoginPath, postOnly(handlers.Login))
	}

	if handlers.Refresh != nil {
		mux.HandleFunc(AccountsRefreshPath, postOnly(handlers.Refresh))
	}

	if handlers.MercantecOAuth != nil {
		mux.HandleFunc(AccountsMercantecOAuthPath, postOnly(handlers.MercantecOAuth))
	}
}

func postOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		next(w, r)
	}
}
