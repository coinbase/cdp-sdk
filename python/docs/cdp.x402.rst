cdp.x402 package
================

The ``cdp.x402`` package provides a CDP-opinionated wrapper for the `x402
internet payments protocol <https://x402.org>`_.

Install the package with the appropriate extra for your use case::

    pip install "cdp-sdk[x402]"          # client + resource server
    pip install "cdp-sdk[x402-fastapi]"  # + FastAPI middleware
    pip install "cdp-sdk[x402-flask]"    # + Flask middleware

Subpackages
-----------

.. toctree::
   :maxdepth: 4

   cdp.x402.core
   cdp.x402.middleware

Submodules
----------

cdp.x402.x402 module
--------------------

.. automodule:: cdp.x402.x402
   :members:
   :undoc-members:
   :show-inheritance:

Module contents
---------------

.. automodule:: cdp.x402
   :members:
   :undoc-members:
   :show-inheritance:
