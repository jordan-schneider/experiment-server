from dataclasses import dataclass
from typing import Optional, Tuple

import boto3
from moto import mock_s3  # type: ignore


@dataclass
class AwsRequestPrices:
    cheap_price_cents: float
    expensive_price_cents: float


class Boto3Counter:
    def __init__(self, client, prices: Optional[AwsRequestPrices] = None):
        self.s3 = client
        self.expensive_requests = 0
        self.cheap_requests = 0
        self.prices = prices

        self.s3.meta.events.register(
            "provide-client-params.s3.PutObject", self._count_expensive
        )
        self.s3.meta.events.register(
            "provide-client-params.s3.CopyObject", self._count_expensive
        )
        # This might not exist
        self.s3.meta.events.register(
            "provide-client-params.s3.PostObject", self._count_expensive
        )
        self.s3.meta.events.register(
            "provide-client-params.s3.ListObjects", self._count_expensive
        )
        self.s3.meta.events.register(
            "provide-client-params.s3.ListObjectsV2", self._count_expensive
        )

        self.s3.meta.events.register(
            "provide-client-params.s3.GetObject", self._count_cheap
        )
        self.s3.meta.events.register(
            "provide-client-params.s3.SelectObjectContent", self._count_cheap
        )

    def _count_expensive(self, **kwargs):
        self.expensive_requests += 1

    def _count_cheap(self, **kwargs):
        self.cheap_requests += 1

    def get_counts(self) -> Tuple[int, int]:
        return self.cheap_requests, self.expensive_requests

    def get_request_cost_cents(self) -> Optional[float]:
        if self.prices is None:
            return None

        return (
            self.prices.cheap_price_cents * self.cheap_requests
            + self.prices.expensive_price_cents * self.expensive_requests
        )


@mock_s3
def main():
    client = boto3.client("s3", region_name="us-east-1")
    counter = Boto3Counter(client)
    client.create_bucket(Bucket="mybucket")
    client.list_objects_v2(Bucket="mybucket")
    client.put_object(Bucket="mybucket", Key="blah.txt", Body="Hello world!")
    resp = client.get_object(Bucket="mybucket", Key="blah.txt")
    print(resp["Body"].read())
    print(counter.get_counts())


if __name__ == "__main__":
    main()
