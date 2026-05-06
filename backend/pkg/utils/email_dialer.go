package utils

import gomail "gopkg.in/mail.v2"

type EmailDialer interface {
	DialAndSend(...*gomail.Message) error
}

var newEmailDialer = func(host string, port int, username, password string) EmailDialer {
	return gomail.NewDialer(host, port, username, password)
}

// FakeEmailDialer type is only used to test SendEmail function,
// so we dont have to set an smtp server
type FakeEmailDialer struct {
	Messages []*gomail.Message
	Err      error
}

func (f *FakeEmailDialer) DialAndSend(messages ...*gomail.Message) error {
	f.Messages = append(f.Messages, messages...)
	return f.Err
}

// UseEmailDialerFactory role is to use the FakeEmailDialer for tests while keeping the smtp server,
// t.Cleanup is required after calling this function to set the previous email dialer once the test is done
func UseEmailDialerFactory(factory func(host string, port int, username, password string) EmailDialer) func() {
	previous := newEmailDialer
	newEmailDialer = factory

	return func() {
		newEmailDialer = previous
	}
}
