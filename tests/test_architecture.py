from pytest_archon import archrule


def test_mainレイヤー__usecaseを利用する() -> None:
    # fmt: off
    (
        archrule("main").match("src.main*")
        .may_import("main*")
        .may_import("usecase*")
        .should_not_import("usecase.repo*")
        .should_not_import("domain*")
        .check("src")
    )
    # fmt: on


def test_usecaseレイヤー__domainを利用する() -> None:
    # fmt: off
    (
        archrule("usecase").match("src.usecase*")
        .should_not_import("main*")
        .may_import("usecase*")
        .may_import("usecase.repo*")
        .may_import("domain*")
        .check("src")
    )
    # fmt: on


def test_usecaseレイヤー_repository__domainを利用する() -> None:
    # fmt: off
    (
        archrule("usecase.repository").match("src.usecase.repo*")
        .should_not_import("main*")
        .should_not_import("usecase*")
        .may_import("usecase.repo*")
        .may_import("domain*")
        .check("src")
    )
    # fmt: on


def test_domainレイヤー__独立している() -> None:
    # fmt: off
    (
        archrule("domain").match("src.domain*")
        .should_not_import("main*")
        .should_not_import("usecase*")
        .should_not_import("usecase.repo*")
        .may_import("domain*")
        .check("src")
    )
    # fmt: on
