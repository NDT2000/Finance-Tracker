// Password and sign-up checks shared by Create account and My Profile. They mirror the backend's
// PasswordPolicy (at least 15 characters, at most 72 UTF-8 bytes); the backend also rejects common
// passwords and stays the final authority.

export function passwordProblem(password) {
    if (!password) return 'Enter a password.';
    if ([...password].length < 15) return 'Use at least 15 characters.';
    if (new TextEncoder().encode(password).length > 72) return 'Use a shorter password: at most 72 bytes.';
    return '';
}

// Returns only the fields with a problem, so {} means the form can be sent.
export function passwordChangeErrors({ current, next, confirm }) {
    const errors = {};
    if (!current) errors.current = 'Enter your current password.';
    const problem = next ? passwordProblem(next) : 'Enter a new password.';
    if (problem) errors.next = problem;
    else if (next !== confirm) errors.confirm = 'The passwords do not match.';
    return errors;
}

export function registerErrors({ fullName, email, password }) {
    const errors = {};
    if (!fullName.trim()) errors.fullName = 'Enter your full name.';
    else if (fullName.trim().length > 100) errors.fullName = 'Use at most 100 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    const problem = passwordProblem(password);
    if (problem) errors.password = problem;
    return errors;
}
