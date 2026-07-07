"""
Domain exceptions for the application.
"""


class DomainException(Exception):
    """Base exception for domain errors."""
    pass


class EntityNotFoundError(DomainException):
    """Raised when an entity is not found."""
    pass


class ValidationError(DomainException):
    """Raised when domain validation fails."""
    pass


class BusinessRuleViolationError(DomainException):
    """Raised when a business rule is violated."""
    pass
